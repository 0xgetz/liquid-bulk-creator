"use strict";

/**
 * Rotating-proxy support.
 *
 * Liquid Console sits behind Clerk + Cloudflare Turnstile, which means a single
 * IP address creating many accounts will get challenged hard. The account
 * creator therefore supports rotating egress:
 *
 *   1. `LBC_PROXIES`          — a comma/newline separated list of full proxy URLs.
 *                               Accounts are assigned round-robin.
 *   2. `LBC_PROXY_TEMPLATE`   — one URL with `{session}` / `{index}` placeholders,
 *                               expanded per account. Ideal for "sticky session"
 *                               rotating gateways (Bright Data, Oxylabs, ProxyRise,
 *                               Smartproxy, IPRoyal, ...). Each account gets a new
 *                               `{session}` value, i.e. a new exit IP.
 *   3. No configuration      — the browser connects directly.
 *
 * A `ProxyPool` hands out proxies and tracks how many accounts/attempts each IP
 * has served so the run can spread load and rotate away from burnt addresses.
 */

const crypto = require("crypto");

function randomToken(len = 8) {
  return crypto.randomBytes(len).toString("hex");
}

function expandTemplate(template, index) {
  if (!template) return "";
  return template
    .replace(/\{session\}/gi, `lbc${randomToken(4)}`)
    .replace(/\{index\}/g, String(index));
}

class ProxyPool {
  /**
   * @param {object} cfg
   * @param {string[]} [cfg.proxyList]
   * @param {string} [cfg.proxyTemplate]
   * @param {boolean} [cfg.rotatePerAccount]
   * @param {string} [cfg.country]
   */
  constructor(cfg) {
    this.static = (cfg.proxyList || []).slice();
    this.template = cfg.proxyTemplate || "";
    this.rotatePerAccount = cfg.rotatePerAccount !== false;
    this.country = cfg.country || "";
    this.usage = new Map(); // proxy URL -> number of assignments
    this.cursor = 0;
  }

  get enabled() {
    return this.static.length > 0 || Boolean(this.template);
  }

  /** Return the proxy URL to use for a given account index, or "" for direct. */
  assign(index) {
    if (this.template) {
      // Template mode: a fresh session per account (when rotating) or a fixed one.
      const expanded = expandTemplate(this.template, this.rotatePerAccount ? index : 0);
      const withCountry = this.country
        ? expanded.replace(/\{country\}/gi, this.country)
        : expanded;
      this.bump(withCountry);
      return withCountry;
    }
    if (this.static.length > 0) {
      const proxy = this.static[this.cursor % this.static.length];
      this.cursor += 1;
      this.bump(proxy);
      return proxy;
    }
    return "";
  }

  /** Pick a different proxy than `current` (used on retry after a failure). */
  rotate(current) {
    if (this.template) return this.assign(this.cursor++);
    if (this.static.length === 0) return "";
    if (this.static.length === 1) return this.static[0];
    let next = this.static[this.cursor % this.static.length];
    this.cursor += 1;
    if (next === current) {
      next = this.static[this.cursor % this.static.length];
      this.cursor += 1;
    }
    this.bump(next);
    return next;
  }

  bump(proxy) {
    if (!proxy) return;
    this.usage.set(proxy, (this.usage.get(proxy) || 0) + 1);
  }

  report() {
    return [...this.usage.entries()].map(([url, n]) => ({
      proxy: redact(url),
      accounts: n,
    }));
  }
}

/** Hide credentials when a proxy URL is printed to logs or reports. */
function redact(url) {
  try {
    const u = new URL(url);
    if (u.username) u.username = "***";
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return url.replace(/\/\/[^@/]+@/, "//***@");
  }
}

/** Convert a proxy URL into the shape Playwright/Puppeteer expects. */
function toPlaywrightProxy(proxyUrl) {
  if (!proxyUrl) return undefined;
  const u = new URL(proxyUrl);
  return {
    server: `${u.protocol}//${u.host}`,
    username: decodeURIComponent(u.username || "") || undefined,
    password: decodeURIComponent(u.password || "") || undefined,
  };
}

module.exports = { ProxyPool, redact, toPlaywrightProxy, expandTemplate };
