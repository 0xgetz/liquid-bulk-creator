"use strict";

/**
 * Programmatic example — use Liquid Bulk Creator as a library.
 *
 *   node examples/library.js
 *
 * Creates a single verified account and prints the API key. Handy when you
 * want to embed account creation inside a larger Node program.
 */

const { chromium } = require("playwright");
const config = require("../src/config");
const { ProxyPool } = require("../src/proxy");
const { LiquidAccountCreator } = require("../src/liquid");

(async () => {
  const localConfig = {
    ...config,
    count: 1,
    headless: true,
    // Point at your rotating gateway, if you have one:
    // proxyTemplate: "http://user:pass@gw.provider.com:8000?session={session}",
  };

  const pool = new ProxyPool(localConfig);
  const browser = await chromium.launch({ headless: localConfig.headless });
  const creator = new LiquidAccountCreator({
    browser,
    config: localConfig,
    logger: console,
  });

  try {
    const proxy = pool.assign(0);
    const record = await creator.createAccount(0, proxy);
    if (record.status === "ok") {
      console.log("email  :", record.email);
      console.log("api key:", record.apiKey);
    } else {
      console.error("failed :", record.error);
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
})();
