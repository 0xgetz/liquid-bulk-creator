"use strict";

/**
 * Liquid Console automation.
 *
 * Liquid Console (console.liquid.ai) is a Next.js app that delegates auth to a
 * Clerk instance (`clerk.console.liquid.ai`) protected by Cloudflare Turnstile,
 * and issues API keys through a Next.js Server Action. There is no public REST
 * signup endpoint we can call directly: the Turnstile token and the Clerk
 * client cookie must come from a real browser. We therefore drive a real
 * headless Chromium with Playwright, which lets Turnstile's non-interactive
 * challenge pass the same way it does for a human.
 *
 * Flow per account:
 *   1. open /sign-up
 *   2. fill email + password, accept terms
 *   3. submit -> Clerk emails a 6-digit code
 *   4. read the code from the emailnator inbox, type it, submit
 *   5. wait for the auto-provisioned workspace
 *   6. open /dashboard/api-keys, create a key with a random name
 *   7. read the one-time key value from the confirmation dialog
 */

const { Emailnator } = require("./emailnator");
const { MailTm } = require("./mailtm");
const { toPlaywrightProxy, redact } = require("./proxy");
const { randomKeyName, randomPassword, jitter } = require("./util");

/** Selectors are collected here so they are easy to update if the UI changes. */
const SEL = {
  email: 'input[name="emailAddress"], input[name="identifier"]',
  password: 'input[name="password"]',
  terms: 'input[name="legalAccepted"]',
  otpInput: 'input[inputmode="numeric"], input[autocomplete="one-time-code"], input[type="text"][maxlength="6"]',
  createKeyBtn: (page) =>
    page.getByRole("button", { name: /create key/i }).first(),
  keyNameInput: "#api-key-name",
  dialogCreate: (page) =>
    page.locator('[role="dialog"]').getByRole("button", { name: /^create key$/i }).last(),
};

class LiquidAccountCreator {
  /**
   * @param {object} opts
   * @param {import('playwright').Browser} opts.browser
   * @param {object} opts.config
   * @param {object} [opts.logger]
   */
  constructor({ browser, config, logger = console }) {
    this.browser = browser;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Create one fully verified account and mint an API key for it.
   * @param {number} index  0-based account index (used for proxy + naming)
   * @param {string} proxyUrl
   * @returns {Promise<object>} account record
   */
  async createAccount(index, proxyUrl = "") {
    const cfg = this.config;
    const password = randomPassword();
    const keyName = randomKeyName();
    const startedAt = Date.now();

    this.logger.info?.(`  proxy: ${proxyUrl ? redact(proxyUrl) : "direct"}`);

    const context = await this.browser.newContext({
      proxy: toPlaywrightProxy(proxyUrl),
      userAgent: cfg.userAgent,
      viewport: { width: 1366, height: 900 },
      locale: "en-US",
      timezoneId: "America/Chicago",
    });
    context.setDefaultTimeout(cfg.actionTimeoutMs);
    context.setDefaultNavigationTimeout(cfg.navigationTimeoutMs);

    const page = await context.newPage();
    const emailnator = new Emailnator({
      base: cfg.emailnatorBase,
      logger: this.logger,
    });

    let record;
    let inbox; // the provider that ends up owning the address
    try {
      // 1. Provision an inbox. Prefer emailnator (real @gmail.com); fall back
      //    to mail.tm if the provider is temporarily unavailable.
      const { email, provider } = await this._provisionInbox(emailnator);
      inbox = provider;
      this.logger.info?.(`  inbox: ${email} (${inbox.name})`);

      // 2. Sign up.
      await this._signup(page, email, password);

      // 3. Read the verification code and finish the signup.
      const { code } = await inbox.waitForCode(email, {
        timeoutMs: cfg.codeTimeoutMs,
        pollMs: cfg.codePollMs,
        logger: this.logger,
      });
      this.logger.info?.(`  code: ${code}`);
      await this._submitOtp(page, code);

      // 4. Wait for the workspace to provision and the dashboard to load.
      await this._waitForDashboard(page);

      // 5. Mint an API key.
      const apiKey = await this._createApiKey(page, keyName);

      record = {
        index,
        email,
        password,
        apiKey,
        keyName,
        proxy: proxyUrl ? redact(proxyUrl) : "direct",
        createdAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        status: "ok",
      };
      this.logger.info?.(`  key:  ${apiKey}`);
    } catch (err) {
      record = {
        index,
        email: undefined,
        password,
        keyName,
        proxy: proxyUrl ? redact(proxyUrl) : "direct",
        createdAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        status: "failed",
        error: err && err.message ? err.message : String(err),
      };
      this.logger.error?.(`  failed: ${record.error}`);
      await this._dumpOnFailure(page, index);
    } finally {
      await context.close().catch(() => {});
    }
    return record;
  }

  // ---- steps ---------------------------------------------------------------

  /**
   * Provision an inbox, preferring emailnator (real @gmail.com) and falling
   * back to mail.tm when the primary provider is unavailable.
   * @returns {Promise<{email:string, provider:object, name:string}>}
   */
  async _provisionInbox(emailnator) {
    const cfg = this.config;
    const providers = [];
    if (cfg.inboxProvider !== "mailtm") {
      providers.push({
        name: "emailnator",
        gen: () => emailnator.generateAddress(),
        waitForCode: (email, opts) => emailnator.waitForCode(email, opts),
      });
    }
    if (cfg.inboxFallback !== false) {
      providers.push({
        name: "mail.tm",
        gen: async () => {
          const mt = new MailTm({ logger: this.logger });
          const { email } = await mt.generateAddress();
          return {
            email,
            provider: { name: "mail.tm", waitForCode: (_email, opts) => mt.waitForCode(opts) },
          };
        },
        waitForCode: null, // mail.tm instance carries its own
      });
    }

    let lastErr;
    for (const p of providers) {
      try {
        const res = await p.gen();
        if (p.waitForCode) {
          return { email: res.email, provider: { name: p.name, waitForCode: p.waitForCode } };
        }
        // mail.tm: the returned instance owns waitForCode(email, opts).
        return { email: res.email, provider: res.provider };
      } catch (err) {
        lastErr = err;
        this.logger.warn?.(`  inbox provider ${p.name} failed: ${err.message}`);
      }
    }
    throw lastErr || new Error("no inbox provider available");
  }

  async _signup(page, email, password) {
    const cfg = this.config;
    await page.goto(`${cfg.consoleUrl}${cfg.signupPath}`, { waitUntil: "domcontentloaded" });
    // Clerk may render sign-in first; make sure we are on the sign-up view.
    if (page.url().includes("/sign-in")) {
      await page.getByRole("link", { name: /sign up/i }).first().click().catch(() => {});
    }
    await page.waitForSelector(SEL.email, { state: "visible" });

    await this._type(page, SEL.email, email);
    await this._type(page, SEL.password, password);

    // Accept terms (rendered as a checkbox inside Clerk's form).
    const terms = page.locator(SEL.terms);
    if (await terms.count()) {
      await terms.first().check({ force: true }).catch(() => {});
    }

    await page.getByRole("button", { name: /^continue$/i }).first().click();
    // A datacenter IP can trigger an interactive Cloudflare Turnstile checkbox.
    // Wait for the challenge to clear (a residential proxy usually makes it
    // invisible; see the rotating-proxy section of the README).
    await this._solveTurnstile(page);
    // Either we move to the verify step, or Clerk flags the email as taken.
    await page.waitForTimeout(2500);
    const body = await page.textContent("body").catch(() => "");
    if (/email address is taken|already have an account\? sign in/i.test(body) && /is taken/i.test(body)) {
      throw new Error("email address already in use");
    }
  }

  /** Wait for / click the Cloudflare Turnstile widget when it is interactive. */
  async _solveTurnstile(page) {
    const deadline = Date.now() + (this.config.turnstileTimeoutMs || 60000);
    let clicked = false;
    while (Date.now() < deadline) {
      // If Clerk advanced past the signup form, we are done.
      if (page.url().includes("/verify-email")) return;

      // Preferred: a real mouse click at the widget's checkbox coordinates.
      if (!clicked) {
        const label = page.getByText(/verify you are human/i).first();
        if (await label.count().catch(() => 0)) {
          const bb = await label.boundingBox().catch(() => null);
          if (bb) {
            const x = bb.x + 22;
            const y = bb.y + bb.height / 2;
            try {
              await page.mouse.move(x - 60, y - 30, { steps: 10 });
              await page.mouse.move(x, y, { steps: 10 });
              await page.mouse.down();
              await page.waitForTimeout(90);
              await page.mouse.up();
              clicked = true;
            } catch {
              /* retry next loop */
            }
          }
        }
      }

      // Also poke inside the Turnstile iframe, in case it is same-origin enough.
      for (const frame of page.frames()) {
        if (!/challenges\.cloudflare\.com/.test(frame.url())) continue;
        await frame
          .locator('input[type="checkbox"], .ctp-checkbox-label, #challenge-stage')
          .first()
          .click({ timeout: 1500 })
          .catch(() => {});
      }
      await page.waitForTimeout(1500);
    }
  }

  async _submitOtp(page, code) {
    // Clerk renders a single OTP input; typing all digits advances automatically.
    const otp = page.locator(SEL.otpInput).first();
    await otp.waitFor({ state: "visible" });
    await otp.click();
    await page.keyboard.type(code, { delay: 90 });
    // Some views require an explicit Continue.
    const cont = page.getByRole("button", { name: /^continue$/i }).first();
    await page.waitForTimeout(1200);
    if (await cont.count()) {
      await cont.click().catch(() => {});
    }
  }

  async _waitForDashboard(page) {
    await page.waitForURL(/\/dashboard/, { timeout: this.config.navigationTimeoutMs });
    // "Setting up your workspace" intermediate screen.
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);
  }

  async _createApiKey(page, keyName) {
    const cfg = this.config;
    await page.goto(`${cfg.consoleUrl}${cfg.apiKeysPath}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("body");
    await page.waitForTimeout(1500);

    await SEL.createKeyBtn(page).click();
    await page.waitForSelector(SEL.keyNameInput, { state: "visible" });
    const input = page.locator(SEL.keyNameInput);
    await input.fill(keyName);
    await SEL.dialogCreate(page).click();

    // The key is shown once in the "Key created" dialog.
    const keyLoc = page.locator("text=/liquid_[A-Za-z0-9]+/");
    await keyLoc.first().waitFor({ timeout: this.config.actionTimeoutMs });
    const text = await page.locator('[role="dialog"]').first().innerText();
    const match = text.match(/liquid_[A-Za-z0-9]+/);
    if (!match) throw new Error("API key value not found in confirmation dialog");
    return match[0];
  }

  // ---- helpers -------------------------------------------------------------

  /** Type text like a human (optional) so Turnstile's analysis stays satisfied. */
  async _type(page, selector, value) {
    const el = page.locator(selector).first();
    await el.click();
    if (this.config.humanTyping) {
      await el.pressSequentially(value, { delay: jitter(40, 120) });
    } else {
      await el.fill(value);
    }
  }

  async _dumpOnFailure(page, index) {
    try {
      const dir = this.config.outputDir;
      const fs = require("fs");
      const path = require("path");
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({
        path: path.join(dir, `failure-${index}-${Date.now()}.png`),
        fullPage: true,
      });
    } catch {
      /* best effort */
    }
  }
}

module.exports = { LiquidAccountCreator, SEL };
