<div align="center">

<img src="assets/logo.svg" alt="Liquid Bulk Creator logo" width="150" />

# Liquid Bulk Creator

**Bulk-create verified Liquid Console accounts — each with its own randomly-named API key — from a single command.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.49-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Liquid%20AI-6C47FF?style=flat-square)](https://console.liquid.ai/)
[![Inbox](https://img.shields.io/badge/Inbox-emailnator-F59E0B?style=flat-square)](https://www.emailnator.com/)
[![Proxy](https://img.shields.io/badge/Proxy-Rotating-06B6D4?style=flat-square)](#-rotating-proxies)
[![Status](https://img.shields.io/badge/Status-Active-22C55E?style=flat-square)]()
[![Made with](https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-EF4444?style=flat-square)]()

[English](README.md) · [Español](docs/README.es.md) · [Português](docs/README.pt.md) · [Deutsch](docs/README.de.md) · [日本語](docs/README.ja.md) · [中文](docs/README.zh.md)

</div>

---

## Overview

**Liquid Bulk Creator** automates the entire Liquid Console onboarding pipeline.
For every account it:

1. assigns the next **rotating proxy** (optional, but strongly recommended);
2. provisions a fresh, real `@gmail.com` inbox on **emailnator**
   (with an automatic **mail.tm** fallback when emailnator is unavailable);
3. signs up on `console.liquid.ai` through a **stealth-patched headless Chromium**
   (so Clerk's Cloudflare Turnstile challenge passes the way it does for a human);
4. reads the 6-digit verification code straight out of the inbox and verifies;
5. waits for the auto-provisioned workspace;
6. mints a **randomly-named API key** and captures its one-time value.

Every account is written to disk. No database, no dashboard, no cloud account —
just a command.

> **Use residential or mobile proxies.** Liquid Console protects signup with
> Cloudflare Turnstile. From a datacenter IP the challenge becomes interactive
> ("Verify you are human") and blocks automation; from a clean residential IP it
> passes invisibly. See [Rotating proxies](#-rotating-proxies).

<div align="center">
<img src="assets/architecture.svg" alt="3D architecture diagram" width="820" />
</div>

## Features

- **One command, any quantity** — `-n 100` creates a hundred verified accounts.
- **Real Gmail inboxes** — emailnator issues genuine `@gmail.com` addresses that
  pass disposable-domain filters, with an automatic mail.tm fallback.
- **Stealth browser automation** — Playwright + `puppeteer-extra-plugin-stealth`
  drives the *real* signup UI, so Clerk + Turnstile behave as they do for a person.
- **Rotating proxies** — round-robin lists, or per-account sticky sessions on a
  rotating gateway (`{session}` placeholder), with optional rotate-on-failure.
- **Random, human-readable key names** — `key-cobalt-falcon-4f2a`.
- **Strong random passwords** — CSPRNG-generated, or pin your own.
- **Concurrency + human pacing** — a worker pool with randomized delays.
- **Automatic retries** — configurable, optionally on a fresh exit IP.
- **Failure screenshots** — every failed account leaves a full-page PNG.
- **Rich exports** — `accounts.json`, `accounts.csv`, `keys.txt`, `summary.json`.

## Quick start

```bash
git clone https://github.com/<you>/liquid-bulk-creator.git
cd liquid-bulk-creator
npm install          # installs Playwright and its Chromium

# Create 5 verified accounts, each with its own API key
node src/index.js --count 5
```

Results land in `accounts/`:

```
accounts/
├── accounts.json   # full records
├── accounts.csv    # spreadsheet-friendly
├── keys.txt        # email:apiKey — pipe straight into your app
└── summary.json    # run stats + proxy usage
```

## Requirements

- **Node.js 18+**
- **Playwright Chromium** (`npm install` downloads it automatically)
- Outbound HTTPS access to `console.liquid.ai`, `clerk.console.liquid.ai`,
  `challenges.cloudflare.com` and `www.emailnator.com`
- *(Recommended)* rotating proxies for anything beyond a handful of accounts

## Usage

```
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
```

### Examples

```bash
# 20 accounts, 4 at a time
node src/index.js -n 20 -c 4

# Static proxy list (round-robin, one IP per account)
node src/index.js -n 6 --proxy http://user:pass@1.2.3.4:8000 --proxy http://user:pass@5.6.7.8:8000

# Rotating gateway — a new exit IP for every account
export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}&country=us'
node src/index.js -n 50 -c 5

# Watch it run in a visible browser
node src/index.js -n 1 --headful
```

## 🔄 Rotating proxies

A single IP that creates many accounts gets challenged hard. This tool supports
two rotation strategies, and rotating to a **fresh IP on failure**.

**Strategy A — static list (round-robin per account):**

```bash
export LBC_PROXIES='http://user:pass@1.2.3.4:8000,http://user:pass@5.6.7.8:8000'
```

**Strategy B — rotating gateway template (a new exit IP per account):**

```bash
export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}'
```

`{session}` is expanded to a fresh random value for every account, which most
gateways translate into a new sticky exit IP. `{index}` and `{country}` are also
supported:

```bash
export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session=s{index}&country={country}'
export LBC_PROXY_COUNTRY=de
```

| Variable | Default | Meaning |
|---|---|---|
| `LBC_PROXIES` | – | Comma-separated proxy list, assigned round-robin |
| `LBC_PROXY_TEMPLATE` | – | Rotating-gateway URL with `{session}` / `{index}` / `{country}` |
| `LBC_PROXY_ROTATE` | `true` | New sticky session per account (template mode) |
| `LBC_PROXY_ROTATE_ON_FAILURE` | `true` | Retry failed accounts on a different exit IP |
| `LBC_PROXY_COUNTRY` | – | Country code substituted into `{country}` |

> Rotating residential or mobile IPs dramatically improve success rates. A
> per-account sticky session keeps a single account's requests on one IP while
> still spreading different accounts across different IPs.

## Configuration

All flags can also be set through environment variables (see `.env.example`):

| Variable | Default | Meaning |
|---|---|---|
| `LBC_COUNT` | `1` | Accounts to create |
| `LBC_CONCURRENCY` | `2` | Parallel workers |
| `LBC_MIN_DELAY_MS` / `LBC_MAX_DELAY_MS` | `4000` / `12000` | Human pause between accounts |
| `LBC_MAX_RETRIES` | `3` | Retries per account |
| `LBC_HEADLESS` | `true` | Run without a visible window |
| `LBC_HUMAN_TYPING` | `true` | Type character-by-character |
| `LBC_CODE_TIMEOUT_MS` | `180000` | How long to wait for the email code |
| `LBC_INBOX_PROVIDER` | `emailnator` | `emailnator`, `mailtm`, or `auto` |
| `LBC_INBOX_FALLBACK` | `true` | Fall back to mail.tm if emailnator fails |
| `LBC_OUTPUT_DIR` | `accounts` | Where results go |

## How it works

| Stage | Module | What happens |
|---|---|---|
| Orchestration | `src/index.js` | CLI parsing, worker pool, retries, aggregation |
| Rotation | `src/proxy.js` | `ProxyPool` assigns / rotates egress per account |
| Inbox | `src/emailnator.js` | Generates a real Gmail address, polls for the code |
| Inbox fallback | `src/mailtm.js` | mail.tm inbox when emailnator is unavailable |
| Automation | `src/liquid.js` | Stealth Playwright: signup → verify → create-key |
| Secrets | `src/util.js` | CSPRNG passwords and random key names |
| Export | `src/output.js` | JSON / CSV / keys.txt / summary |

**Why a browser?** Liquid Console authenticates with Clerk, which protects its
signup with a Cloudflare Turnstile token. That token is produced *inside* the
page, so there is no honest way to script signup with plain HTTP calls. Driving
a real Chromium is both simpler and more reliable, and it keeps working when the
UI changes its internal endpoints.

**Why stealth + residential proxies?** Turnstile scores the browser *and* the
IP. A vanilla headless browser from a datacenter IP is challenged interactively
and blocks the flow. This project applies the standard
`puppeteer-extra-plugin-stealth` patches and expects a **clean residential or
mobile egress**; together they let the challenge pass invisibly, just like a
real visitor.

## Output format

`accounts.json`:

```json
[
  {
    "index": 0,
    "email": "brightwren7+k2p1@gmail.com",
    "password": "xQ4$mZ9nT!vR2pLc",
    "apiKey": "liquid_7fyqo2q0jwT9hqZCQtiUZ0suBIh6ZlPVIv3iItvhBtGIjGtS",
    "keyName": "key-cobalt-falcon-4f2a",
    "proxy": "http://***:***@1.2.3.4:8000/",
    "createdAt": "2026-10-06T10:30:00.000Z",
    "durationMs": 48213,
    "status": "ok"
  }
]
```

`keys.txt`:

```
brightwren7+k2p1@gmail.com:liquid_7fyqo2q0jwT9hqZCQtiUZ0suBIh6ZlPVIv3iItvhBtGIjGtS
```

## Project structure

```
liquid-bulk-creator/
├── src/
│   ├── index.js       # CLI + orchestration
│   ├── config.js      # flags + environment
│   ├── proxy.js       # rotating proxy pool
│   ├── emailnator.js  # inbox provider client
│   ├── mailtm.js      # inbox fallback provider
│   ├── liquid.js      # stealth Playwright automation
│   ├── util.js        # credential helpers
│   └── output.js      # exporters
├── assets/            # logo + 3D architecture diagram
├── docs/              # READMEs in 5 more languages
├── examples/          # runnable snippets
├── package.json
└── LICENSE
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Stuck on "Just a moment" | Add residential/mobile proxies; run `--headful` to watch |
| "email address already in use" | Normal — the tool retries with a fresh inbox |
| No verification code | emailnator may be slow; raise `LBC_CODE_TIMEOUT_MS` |
| Many failures from one IP | Enable `LBC_PROXY_ROTATE_ON_FAILURE` and use a larger pool |
| Chromium missing | `npx playwright install chromium` |

## Legal & responsible use

This tool is provided for **educational and automation-research purposes**.
You are responsible for complying with Liquid AI's terms of service, Clerk's
terms, emailnator's terms, and all applicable laws in your jurisdiction. Do not
use it to abuse, spam, or overload any service. Accounts you create are yours to
manage.

## License

[MIT](LICENSE)
