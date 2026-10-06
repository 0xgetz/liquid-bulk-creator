#!/usr/bin/env node
"use strict";

/**
 * Liquid Bulk Creator — CLI entry point.
 *
 * Examples:
 *   node src/index.js --count 5
 *   node src/index.js --count 10 --concurrency 3
 *   LBC_PROXY_TEMPLATE='http://user:pass@gw.proxy.com:8000?session={session}' node src/index.js -n 20
 *   LBC_PROXIES='http://a:p@1.2.3.4:8000,http://a:p@5.6.7.8:8000' node src/index.js -n 4
 */

const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);
const config = require("./config");
const { ProxyPool } = require("./proxy");
const { LiquidAccountCreator } = require("./liquid");
const { writeAccounts, writeSummary, ensureDir } = require("./output");
const { randomDelay } = require("./util");

function parseArgs(argv) {
  const args = { ...config };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "-n":
      case "--count":
        args.count = Number.parseInt(next(), 10);
        break;
      case "-c":
      case "--concurrency":
        args.concurrency = Number.parseInt(next(), 10);
        break;
      case "--headful":
        args.headless = false;
        break;
      case "--headless":
        args.headless = true;
        break;
      case "-o":
      case "--output":
        args.outputDir = next();
        break;
      case "--proxy":
        args.proxyList.push(next());
        break;
      case "--proxy-template":
        args.proxyTemplate = next();
        break;
      case "--no-proxy-rotate":
        args.proxyRotateOnFailure = false;
        break;
      case "-h":
      case "--help":
        args.help = true;
        break;
      default:
        if (a.startsWith("--count=")) args.count = Number.parseInt(a.split("=")[1], 10);
        break;
    }
  }
  return args;
}

const HELP = `
Liquid Bulk Creator — create verified Liquid Console accounts with API keys.

Usage:
  node src/index.js [options]

Options:
  -n, --count <n>            Number of accounts to create        (default 1)
  -c, --concurrency <n>      Parallel accounts                   (default 2)
  -o, --output <dir>         Output directory                    (default accounts)
      --proxy <url>          Add a rotating proxy (repeatable)
      --proxy-template <t>   Proxy URL template with {session}/{index}
      --no-proxy-rotate      Do not switch proxy when retrying
      --headful              Show the browser window
      --headless             Hide the browser window             (default)
  -h, --help                 Show this help

Environment:
  LBC_PROXIES                Comma-separated proxy list
  LBC_PROXY_TEMPLATE         Rotating-gateway URL template
  LBC_PROXY_ROTATE           true/false — new exit IP per account (default true)
  LBC_PROXY_ROTATE_ON_FAILURE  true/false — rotate on retry (default true)
  LBC_PROXY_COUNTRY          Optional country code for {country} in the template
  LBC_CONCURRENCY            Parallelism
  LBC_HEADLESS               true/false
  LBC_CODE_TIMEOUT_MS        Wait for the email code (default 180000)
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (!Number.isFinite(args.count) || args.count < 1) {
    process.stderr.write("error: --count must be >= 1\n");
    process.exitCode = 2;
    return;
  }

  ensureDir(args.outputDir);
  const pool = new ProxyPool(args);
  const log = {
    info: (m) => console.log(`[lbc] ${m}`),
    warn: (m) => console.warn(`[lbc] ${m}`),
    error: (m) => console.error(`[lbc] ${m}`),
  };

  log.info(`Liquid Bulk Creator — ${args.count} account(s), concurrency ${args.concurrency}`);
  log.info(`output dir: ${args.outputDir}`);
  if (pool.enabled) {
    log.info(`proxy: enabled (${pool.static.length || "template"} entr${(pool.static.length || 1) === 1 ? "y" : "ies"}, rotate=${args.proxyRotatePerAccount})`);
  } else {
    log.info("proxy: disabled (direct connection)");
  }

  const browser = await chromium.launch({
    headless: args.headless,
    channel: args.browserChannel || undefined,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });

  const creator = new LiquidAccountCreator({ browser, config: args, logger: log });
  const results = [];

  // Simple worker pool preserving the requested concurrency.
  let cursor = 0;
  async function worker(workerId) {
    while (true) {
      const index = cursor++;
      if (index >= args.count) return;
      log.info(`[${index + 1}/${args.count}] creating account...`);
      const record = await attemptWithRetries(creator, pool, index, args, log);
      results.push(record);
      if (index < args.count - 1) {
        await randomDelay(args.minDelayMs, args.maxDelayMs);
      }
    }
  }

  const workers = Array.from({ length: Math.min(args.concurrency, args.count) }, (_, i) =>
    worker(i),
  );
  try {
    await Promise.all(workers);
  } finally {
    await browser.close().catch(() => {});
  }

  results.sort((a, b) => a.index - b.index);
  const stats = writeAccounts(results, args.outputDir);
  writeSummary(
    {
      startedAt: new Date().toISOString(),
      requested: args.count,
      created: stats.ok,
      failed: stats.failed,
      concurrency: args.concurrency,
      proxyUsage: pool.report(),
    },
    args.outputDir,
  );

  log.info(`done: ${stats.ok} created, ${stats.failed} failed`);
  log.info(`results: ${args.outputDir}/accounts.json, ${args.outputDir}/accounts.csv, ${args.outputDir}/keys.txt`);
  if (stats.failed && !stats.ok) process.exitCode = 1;
}

async function attemptWithRetries(creator, pool, index, args, log) {
  let lastRecord;
  let usedProxy = "";
  for (let attempt = 0; attempt <= args.maxRetries; attempt++) {
    const proxyUrl =
      attempt === 0 || !args.proxyRotateOnFailure ? pool.assign(index) : pool.rotate(usedProxy);
    usedProxy = proxyUrl;
    if (attempt > 0) log.warn(`  retry ${attempt}/${args.maxRetries} for account ${index + 1}`);
    const record = await creator.createAccount(index, proxyUrl);
    if (record.status === "ok") return record;
    lastRecord = record;
  }
  return lastRecord;
}

main().catch((err) => {
  console.error(`[lbc] fatal: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
