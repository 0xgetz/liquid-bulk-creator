"use strict";

/**
 * Central configuration for Liquid Bulk Creator.
 *
 * Everything is overridable through environment variables so the tool can be
 * embedded in CI-less pipelines, cron jobs or a plain shell without editing
 * code. Defaults are chosen to be safe and observable.
 */

function bool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

function int(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function list(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const config = {
  // ---- Batch -----------------------------------------------------------------
  count: int(process.env.LBC_COUNT, 1),
  concurrency: int(process.env.LBC_CONCURRENCY, 2),
  minDelayMs: int(process.env.LBC_MIN_DELAY_MS, 4000),
  maxDelayMs: int(process.env.LBC_MAX_DELAY_MS, 12000),
  maxRetries: int(process.env.LBC_MAX_RETRIES, 3),

  // ---- Targets ---------------------------------------------------------------
  consoleUrl: process.env.LBC_CONSOLE_URL || "https://console.liquid.ai",
  signupPath: "/sign-up",
  apiKeysPath: "/dashboard/api-keys",

  // emailnator inbox provider
  emailnatorBase: process.env.LBC_EMAILNATOR_URL || "https://www.emailnator.com",

  // ---- Browser ---------------------------------------------------------------
  headless: bool(process.env.LBC_HEADLESS, true),
  browserChannel: process.env.LBC_BROWSER_CHANNEL || "", // "", "chrome", "msedge"
  userAgent:
    process.env.LBC_USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  navigationTimeoutMs: int(process.env.LBC_NAV_TIMEOUT_MS, 60000),
  actionTimeoutMs: int(process.env.LBC_ACTION_TIMEOUT_MS, 30000),
  turnstileTimeoutMs: int(process.env.LBC_TURNSTILE_TIMEOUT_MS, 60000),
  humanTyping: bool(process.env.LBC_HUMAN_TYPING, true),

  // ---- Proxy (rotating) ------------------------------------------------------
  // A list of proxy URLs. Each new account picks the next proxy (round-robin),
  // which is what "rotating proxy" means at the account level. See proxy.js.
  proxyList: list(process.env.LBC_PROXIES, []),
  // Template with {session} and/or {index} placeholders expanded per account,
  // e.g. "http://user:pass@gate.example.com:8000" or a rotating gateway URL.
  proxyTemplate: process.env.LBC_PROXY_TEMPLATE || "",
  // When true, every account uses a fresh sticky session id in the template.
  proxyRotatePerAccount: bool(process.env.LBC_PROXY_ROTATE, true),
  // Optional: force a fresh proxy when an account fails (retry on new IP).
  proxyRotateOnFailure: bool(process.env.LBC_PROXY_ROTATE_ON_FAILURE, true),
  proxyCountry: process.env.LBC_PROXY_COUNTRY || "",

  // ---- Output ----------------------------------------------------------------
  outputDir: process.env.LBC_OUTPUT_DIR || "accounts",

  // ---- Verification ----------------------------------------------------------
  // How long to poll the inbox for a verification code, per step.
  codeTimeoutMs: int(process.env.LBC_CODE_TIMEOUT_MS, 180000),
  codePollMs: int(process.env.LBC_CODE_POLL_MS, 5000),
  // Which inbox to use: "emailnator" (default, real @gmail.com), "mailtm", or
  // "auto" (try emailnator first, then fall back). Fallback can be disabled.
  inboxProvider: process.env.LBC_INBOX_PROVIDER || "emailnator",
  inboxFallback: bool(process.env.LBC_INBOX_FALLBACK, true),
};

module.exports = config;
