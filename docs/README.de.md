<div align="center">

<img src="../assets/logo.svg" alt="Liquid Bulk Creator" width="150" />

# Liquid Bulk Creator

**Erstelle massenhaft verifizierte Liquid-Console-Konten – jedes mit einem eigenen zufällig benannten API-Schlüssel – mit einem einzigen Befehl.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.49-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?style=flat-square)](../LICENSE)
[![Platform](https://img.shields.io/badge/Plattform-Liquid%20AI-6C47FF?style=flat-square)](https://console.liquid.ai/)
[![Inbox](https://img.shields.io/badge/Postfach-emailnator-F59E0B?style=flat-square)](https://www.emailnator.com/)
[![Proxy](https://img.shields.io/badge/Proxy-Rotierend-06B6D4?style=flat-square)](#-rotierende-proxys)
[![Status](https://img.shields.io/badge/Status-Aktiv-22C55E?style=flat-square)]()

[English](../README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [日本語](README.ja.md) · [中文](README.zh.md)

</div>

---

## Überblick

Der **Liquid Bulk Creator** automatisiert den gesamten Onboarding-Ablauf von
Liquid Console. Für jedes Konto:

1. weist den nächsten **rotierenden Proxy** zu (optional, aber empfohlen);
2. erstellt ein echtes `@gmail.com`-Postfach über **emailnator**;
3. registriert sich auf `console.liquid.ai` über einen **echten Headless-Chromium**
   (so läuft Clerk's Cloudflare-Turnstile wie bei einem Menschen durch);
4. liest den 6-stelligen Bestätigungscode aus dem Postfach und verifiziert;
5. wartet auf den automatisch angelegten Workspace;
6. erstellt einen **zufällig benannten API-Schlüssel** und erfasst dessen Wert.

Alles wird auf die Festplatte geschrieben – keine Datenbank, kein Dashboard.

## Funktionen

- **Ein Befehl, beliebige Menge** — `-n 100` erzeugt hundert verifizierte Konten.
- **Echte Gmail-Postfächer** — `@gmail.com`-Adressen, die Filter passieren.
- **Browsergetreue Anmeldung** — Playwright nutzt die echte Registrierungsoberfläche.
- **Rotierende Proxys** — Round-Robin-Listen oder feste Sitzungen pro Konto.
- **Zufällige, lesbare Schlüsselnamen** — `key-cobalt-falcon-4f2a`.
- **Starke Passwörter** — per CSPRNG erzeugt.
- **Nebenläufigkeit & menschliches Tempo** — Worker-Pool mit Zufallspausen.
- **Automatische Wiederholungen** — optional über eine neue IP.
- **Fehler-Screenshots** — ganzseitige PNGs bei jedem Fehlschlag.
- **Umfangreiche Exporte** — `accounts.json`, `accounts.csv`, `keys.txt`, `summary.json`.

## Schnellstart

```bash
git clone https://github.com/<du>/liquid-bulk-creator.git
cd liquid-bulk-creator
npm install

node src/index.js --count 5
```

Ergebnisse liegen in `accounts/`.

## Voraussetzungen

- **Node.js 18+**
- **Playwright Chromium** (wird von `npm install` installiert)
- HTTPS-Zugang zu `console.liquid.ai`, `clerk.console.liquid.ai`,
  `challenges.cloudflare.com` und `www.emailnator.com`
- *(Empfohlen)* rotierende Proxys für mehr als ein paar Konten

> **Verwende residenzielle oder mobile Proxys.** Liquid Console schützt die
> Registrierung mit Cloudflare Turnstile. Von einer Datacenter-IP wird die
> Herausforderung interaktiv („Verify you are human") und blockiert die
> Automatisierung; von einer sauberen residenziellen IP läuft sie unsichtbar
> durch.

## Verwendung

```bash
node src/index.js -n 20 -c 4

node src/index.js -n 6 --proxy http://user:pass@1.2.3.4:8000 --proxy http://user:pass@5.6.7.8:8000

export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}&country=de'
node src/index.js -n 50 -c 5
```

## 🔄 Rotierende Proxys

**Strategie A — statische Liste (Round-Robin):**

```bash
export LBC_PROXIES='http://user:pass@1.2.3.4:8000,http://user:pass@5.6.7.8:8000'
```

**Strategie B — rotierendes Gateway-Template (neue IP pro Konto):**

```bash
export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}'
```

`{session}` erzeugt pro Konto einen neuen Zufallswert; `{index}` und `{country}`
werden ebenfalls unterstützt.

| Variable | Standard | Bedeutung |
|---|---|---|
| `LBC_PROXIES` | – | Kommagetrennte Proxy-Liste |
| `LBC_PROXY_TEMPLATE` | – | URL mit `{session}` / `{index}` / `{country}` |
| `LBC_PROXY_ROTATE` | `true` | Neue Sitzung pro Konto |
| `LBC_PROXY_ROTATE_ON_FAILURE` | `true` | Wiederholung über andere IP |
| `LBC_PROXY_COUNTRY` | – | Ländercode für `{country}` |

## Umgebungsvariablen

| Variable | Standard | Bedeutung |
|---|---|---|
| `LBC_COUNT` | `1` | Anzahl der Konten |
| `LBC_CONCURRENCY` | `2` | Parallele Worker |
| `LBC_MIN_DELAY_MS` / `LBC_MAX_DELAY_MS` | `4000` / `12000` | Pause zwischen Konten |
| `LBC_MAX_RETRIES` | `3` | Wiederholungen pro Konto |
| `LBC_HEADLESS` | `true` | Ohne sichtbares Fenster |
| `LBC_CODE_TIMEOUT_MS` | `180000` | Wartezeit auf den Code |
| `LBC_OUTPUT_DIR` | `accounts` | Ausgabeordner |

## Wie es funktioniert

| Phase | Modul | Was passiert |
|---|---|---|
| Orchestrierung | `src/index.js` | CLI, Worker-Pool, Wiederholungen |
| Rotation | `src/proxy.js` | Weist Egress pro Konto zu |
| Postfach | `src/emailnator.js` | Erzeugt Adresse, sucht Code |
| Automatisierung | `src/liquid.js` | Anmeldung → Verifizierung → Schlüssel |
| Geheimnisse | `src/util.js` | Passwörter und Zufallsnamen |
| Export | `src/output.js` | JSON / CSV / keys.txt / Zusammenfassung |

**Warum ein Browser?** Liquid Console nutzt Clerk, dessen Turnstile-Schutz das
Token innerhalb der Seite erzeugt – mit reinem HTTP lässt sich das nicht redlich
automatisieren. Echter Chromium ist einfacher und zuverlässiger.

## Fehlerbehebung

| Symptom | Lösung |
|---|---|
| Hängt bei „Just a moment" | Residenzielle/mobile Proxys nutzen; `--headful` |
| „email address already in use" | Normal — Wiederholung mit neuem Postfach |
| Kein Bestätigungscode | `LBC_CODE_TIMEOUT_MS` erhöhen |
| Viele Fehler von einer IP | `LBC_PROXY_ROTATE_ON_FAILURE` aktivieren |
| Chromium fehlt | `npx playwright install chromium` |

## Rechtliches & verantwortungsvolle Nutzung

Dieses Werkzeug dient **Bildungs- und Automatisierungsforschungszwecken**. Du
bist für die Einhaltung der Nutzungsbedingungen von Liquid AI, Clerk und
emailnator sowie aller geltenden Gesetze verantwortlich. Kein Missbrauch, Spam
oder Überlasten von Diensten.

## Lizenz

[MIT](../LICENSE)
