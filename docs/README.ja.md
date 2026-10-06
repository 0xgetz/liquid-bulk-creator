<div align="center">

<img src="../assets/logo.svg" alt="Liquid Bulk Creator" width="150" />

# Liquid Bulk Creator

**1つのコマンドで、検証済みの Liquid Console アカウントと、それぞれにランダム名の API キーを一括作成。**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.49-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?style=flat-square)](../LICENSE)
[![Platform](https://img.shields.io/badge/プラットフォーム-Liquid%20AI-6C47FF?style=flat-square)](https://console.liquid.ai/)
[![Inbox](https://img.shields.io/badge/受信トレイ-emailnator-F59E0B?style=flat-square)](https://www.emailnator.com/)
[![Proxy](https://img.shields.io/badge/プロキシ-ローテーション-06B6D4?style=flat-square)](#-ローテーションプロキシ)
[![Status](https://img.shields.io/badge/ステータス-稼働中-22C55E?style=flat-square)]()

[English](../README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [日本語](README.ja.md) · [中文](README.zh.md)

</div>

---

## 概要

**Liquid Bulk Creator** は Liquid Console のオンボーディング全体を自動化します。
各アカウントについて:

1. 次の**ローテーションプロキシ**を割り当て(任意・推奨);
2. **emailnator** で本物の `@gmail.com` 受信トレイを作成;
3. **実ブラウザのヘッドレス Chromium** で `console.liquid.ai` に登録
   (Clerk の Cloudflare Turnstile が人間と同様に通過します);
4. 受信トレイから6桁の認証コードを読み取り、検証;
5. 自動作成されたワークスペースを待機;
6. **ランダム名の API キー**を作成し、その値を取得。

すべてディスクに保存されます。データベースもダッシュボードも不要です。

## 特徴

- **1コマンドで任意の数量** — `-n 100` で100件作成。
- **本物の Gmail** — 使い捨てドメインフィルタを通過する `@gmail.com`。
- **ブラウザ忠実な認証** — Playwright が実際の登録 UI を操作。
- **ローテーションプロキシ** — ラウンドロビン、またはアカウントごとの固定セッション。
- **ランダムで読みやすいキー名** — `key-cobalt-falcon-4f2a`。
- **強力なパスワード** — CSPRNG で生成。
- **並列処理と人間らしい間隔** — ランダム遅延付きワーカープール。
- **自動リトライ** — 必要に応じて新しい IP で。
- **失敗時のスクリーンショット** — フルページ PNG。
- **豊富な出力** — `accounts.json`、`accounts.csv`、`keys.txt`、`summary.json`。

## クイックスタート

```bash
git clone https://github.com/<あなた>/liquid-bulk-creator.git
cd liquid-bulk-creator
npm install

node src/index.js --count 5
```

結果は `accounts/` に出力されます。

## 要件

- **Node.js 18+**
- **Playwright Chromium**(`npm install` で導入)
- `console.liquid.ai`、`clerk.console.liquid.ai`、`challenges.cloudflare.com`、
  `www.emailnator.com` への HTTPS アクセス
- *(推奨)* 多数作成する場合のローテーションプロキシ

> **レジデンシャルまたはモバイルプロキシを使用してください。** Liquid Console は
> Cloudflare Turnstile で登録を保護しています。データセンター IP ではチャレンジが
> 対話式(「Verify you are human」)になり自動化をブロックしますが、クリーンな
> レジデンシャル IP では不可視で通過します。

## 使い方

```bash
node src/index.js -n 20 -c 4

node src/index.js -n 6 --proxy http://user:pass@1.2.3.4:8000 --proxy http://user:pass@5.6.7.8:8000

export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}&country=jp'
node src/index.js -n 50 -c 5
```

## 🔄 ローテーションプロキシ

**方法 A — 静的リスト(ラウンドロビン):**

```bash
export LBC_PROXIES='http://user:pass@1.2.3.4:8000,http://user:pass@5.6.7.8:8000'
```

**方法 B — ローテーションゲートウェイのテンプレート(アカウントごとに新しい IP):**

```bash
export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}'
```

`{session}` はアカウントごとに新しいランダム値に展開されます。`{index}` と
`{country}` も使用できます。

| 変数 | 既定値 | 意味 |
|---|---|---|
| `LBC_PROXIES` | – | カンマ区切りのプロキシ一覧 |
| `LBC_PROXY_TEMPLATE` | – | `{session}` / `{index}` / `{country}` を含む URL |
| `LBC_PROXY_ROTATE` | `true` | アカウントごとに新しいセッション |
| `LBC_PROXY_ROTATE_ON_FAILURE` | `true` | 失敗時に別 IP で再試行 |
| `LBC_PROXY_COUNTRY` | – | `{country}` に展開する国コード |

## 環境変数

| 変数 | 既定値 | 意味 |
|---|---|---|
| `LBC_COUNT` | `1` | 作成するアカウント数 |
| `LBC_CONCURRENCY` | `2` | 並列ワーカー数 |
| `LBC_MIN_DELAY_MS` / `LBC_MAX_DELAY_MS` | `4000` / `12000` | アカウント間の待機 |
| `LBC_MAX_RETRIES` | `3` | アカウントごとの再試行 |
| `LBC_HEADLESS` | `true` | ウィンドウ非表示 |
| `LBC_CODE_TIMEOUT_MS` | `180000` | 認証コードの待機時間 |
| `LBC_OUTPUT_DIR` | `accounts` | 出力先 |

## 仕組み

| 段階 | モジュール | 内容 |
|---|---|---|
| オーケストレーション | `src/index.js` | CLI、ワーカープール、再試行 |
| ローテーション | `src/proxy.js` | アカウントごとに出口を割当 |
| 受信トレイ | `src/emailnator.js` | アドレス生成とコード取得 |
| 自動化 | `src/liquid.js` | 登録 → 検証 → キー作成 |
| シークレット | `src/util.js` | パスワードと乱数名 |
| 出力 | `src/output.js` | JSON / CSV / keys.txt / サマリ |

**なぜブラウザか?** Liquid Console は Clerk を使用し、その Turnstile 保護は
ページ内でトークンを生成します。純粋な HTTP では正直に自動化できません。
実 Chromium のほうが簡単で信頼性が高いのです。

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| "Just a moment" で停止 | レジデンシャル/モバイルプロキシを追加、`--headful` |
| "email address already in use" | 正常 — 新しい受信トレイで再試行 |
| 認証コードが来ない | `LBC_CODE_TIMEOUT_MS` を増やす |
| 1つの IP で多数失敗 | `LBC_PROXY_ROTATE_ON_FAILURE` を有効化 |
| Chromium が無い | `npx playwright install chromium` |

## 法的・責任ある利用

本ツールは**教育および自動化研究目的**で提供されます。Liquid AI、Clerk、
emailnator の利用規約および適用法を遵守する責任は利用者にあります。乱用、
スパム、サービスへの過負荷に使用しないでください。

## ライセンス

[MIT](../LICENSE)
