<div align="center">

<img src="../assets/logo.svg" alt="Liquid Bulk Creator" width="150" />

# Liquid Bulk Creator

**一条命令批量创建已验证的 Liquid Console 账户，并为每个账户生成随机命名的 API 密钥。**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.49-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?style=flat-square)](../LICENSE)
[![Platform](https://img.shields.io/badge/平台-Liquid%20AI-6C47FF?style=flat-square)](https://console.liquid.ai/)
[![Inbox](https://img.shields.io/badge/邮箱-emailnator-F59E0B?style=flat-square)](https://www.emailnator.com/)
[![Proxy](https://img.shields.io/badge/代理-轮换-06B6D4?style=flat-square)](#-轮换代理)
[![Status](https://img.shields.io/badge/状态-运行中-22C55E?style=flat-square)]()

[English](../README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [日本語](README.ja.md) · [中文](README.zh.md)

</div>

---

## 概述

**Liquid Bulk Creator** 自动化整个 Liquid Console 注册流程。对每个账户：

1. 分配下一个**轮换代理**（可选，但强烈推荐）；
2. 通过 **emailnator** 创建真实的 `@gmail.com` 邮箱；
3. 使用**真实的无头 Chromium** 在 `console.liquid.ai` 上注册
   （Clerk 的 Cloudflare Turnstile 会像真人一样通过）；
4. 从邮箱读取 6 位验证码并完成验证；
5. 等待系统自动创建的工作区；
6. 创建**随机命名的 API 密钥**并捕获其值。

所有结果写入磁盘。无需数据库、面板或云账户。

## 功能

- **一条命令，任意数量** — `-n 100` 创建一百个已验证账户。
- **真实 Gmail 邮箱** — 可绕过一次性域名过滤的 `@gmail.com` 地址。
- **还原浏览器的认证** — Playwright 驱动真实注册界面。
- **轮换代理** — 轮询列表，或按账户固定会话。
- **随机且易读的密钥名** — `key-cobalt-falcon-4f2a`。
- **强密码** — 由 CSPRNG 生成。
- **并发与拟人节奏** — 带随机延迟的工作池。
- **自动重试** — 可选使用新出口 IP。
- **失败截图** — 每次失败保存整页 PNG。
- **完整导出** — `accounts.json`、`accounts.csv`、`keys.txt`、`summary.json`。

## 快速开始

```bash
git clone https://github.com/<你的用户名>/liquid-bulk-creator.git
cd liquid-bulk-creator
npm install

node src/index.js --count 5
```

结果保存在 `accounts/`。

## 环境要求

- **Node.js 18+**
- **Playwright Chromium**（`npm install` 会自动安装）
- 可访问 `console.liquid.ai`、`clerk.console.liquid.ai`、
  `challenges.cloudflare.com` 和 `www.emailnator.com` 的 HTTPS
- *（推荐）* 创建较多账户时使用轮换代理

## 用法

```bash
node src/index.js -n 20 -c 4

node src/index.js -n 6 --proxy http://user:pass@1.2.3.4:8000 --proxy http://user:pass@5.6.7.8:8000

export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}&country=cn'
node src/index.js -n 50 -c 5
```

## 🔄 轮换代理

**方案 A — 静态列表（轮询）：**

```bash
export LBC_PROXIES='http://user:pass@1.2.3.4:8000,http://user:pass@5.6.7.8:8000'
```

**方案 B — 轮换网关模板（每个账户新 IP）：**

```bash
export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}'
```

`{session}` 会为每个账户展开为新的随机值；也支持 `{index}` 和 `{country}`。

| 变量 | 默认 | 含义 |
|---|---|---|
| `LBC_PROXIES` | – | 逗号分隔的代理列表 |
| `LBC_PROXY_TEMPLATE` | – | 含 `{session}` / `{index}` / `{country}` 的 URL |
| `LBC_PROXY_ROTATE` | `true` | 每个账户使用新会话 |
| `LBC_PROXY_ROTATE_ON_FAILURE` | `true` | 失败时换 IP 重试 |
| `LBC_PROXY_COUNTRY` | – | 用于 `{country}` 的国家代码 |

## 环境变量

| 变量 | 默认 | 含义 |
|---|---|---|
| `LBC_COUNT` | `1` | 创建的账户数 |
| `LBC_CONCURRENCY` | `2` | 并行工作数 |
| `LBC_MIN_DELAY_MS` / `LBC_MAX_DELAY_MS` | `4000` / `12000` | 账户间隔 |
| `LBC_MAX_RETRIES` | `3` | 每个账户重试次数 |
| `LBC_HEADLESS` | `true` | 无窗口运行 |
| `LBC_CODE_TIMEOUT_MS` | `180000` | 等待验证码时间 |
| `LBC_OUTPUT_DIR` | `accounts` | 输出目录 |

## 工作原理

| 阶段 | 模块 | 说明 |
|---|---|---|
| 编排 | `src/index.js` | CLI、工作池、重试 |
| 轮换 | `src/proxy.js` | 为每个账户分配出口 |
| 邮箱 | `src/emailnator.js` | 生成地址并获取验证码 |
| 自动化 | `src/liquid.js` | 注册 → 验证 → 创建密钥 |
| 密钥 | `src/util.js` | 密码与随机名 |
| 导出 | `src/output.js` | JSON / CSV / keys.txt / 汇总 |

**为什么用浏览器？** Liquid Console 使用 Clerk，其 Turnstile 保护在页面内
生成令牌，纯 HTTP 无法诚实自动化。真实 Chromium 更简单也更可靠。

## 故障排查

| 现象 | 处理 |
|---|---|
| 卡在 "Just a moment" | 使用住宅/移动代理；运行 `--headful` |
| "email address already in use" | 正常 — 会用新邮箱重试 |
| 收不到验证码 | 调大 `LBC_CODE_TIMEOUT_MS` |
| 同一 IP 大量失败 | 启用 `LBC_PROXY_ROTATE_ON_FAILURE` |
| 缺少 Chromium | `npx playwright install chromium` |

## 法律与负责任使用

本工具仅供**教育与自动化研究**之用。你有责任遵守 Liquid AI、Clerk 与
emailnator 的服务条款及适用法律。请勿用于滥用、发送垃圾邮件或压垮服务。

## 许可证

[MIT](../LICENSE)
