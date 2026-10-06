<div align="center">

<img src="../assets/logo.svg" alt="Liquid Bulk Creator" width="150" />

# Liquid Bulk Creator

**Crea en masa cuentas verificadas de Liquid Console — cada una con su propia clave API de nombre aleatorio — con un solo comando.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.49-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?style=flat-square)](../LICENSE)
[![Platform](https://img.shields.io/badge/Plataforma-Liquid%20AI-6C47FF?style=flat-square)](https://console.liquid.ai/)
[![Inbox](https://img.shields.io/badge/Bandeja-emailnator-F59E0B?style=flat-square)](https://www.emailnator.com/)
[![Proxy](https://img.shields.io/badge/Proxy-Rotativo-06B6D4?style=flat-square)](#-proxies-rotativos)
[![Estado](https://img.shields.io/badge/Estado-Activo-22C55E?style=flat-square)]()

[English](../README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [日本語](README.ja.md) · [中文](README.zh.md)

</div>

---

## Descripción general

**Liquid Bulk Creator** automatiza todo el proceso de alta en Liquid Console.
Para cada cuenta:

1. asigna el siguiente **proxy rotativo** (opcional, pero recomendado);
2. crea una bandeja real `@gmail.com` en **emailnator**;
3. se registra en `console.liquid.ai` mediante un **Chromium headless real**
   (así el desafío Cloudflare Turnstile de Clerk se resuelve como con una persona);
4. lee el código de verificación de 6 dígitos de la bandeja y verifica;
5. espera al espacio de trabajo creado automáticamente;
6. genera una **clave API con nombre aleatorio** y captura su valor.

Todo se guarda en disco. Sin base de datos, sin panel, sin cuenta en la nube.

## Características

- **Un comando, cualquier cantidad** — `-n 100` crea cien cuentas verificadas.
- **Bandejas Gmail reales** — direcciones `@gmail.com` que superan los filtros.
- **Autenticación fiel al navegador** — Playwright usa la interfaz real de registro.
- **Proxies rotativos** — listas round-robin o sesiones fijas por cuenta.
- **Nombres de clave aleatorios y legibles** — `key-cobalt-falcon-4f2a`.
- **Contraseñas fuertes** — generadas con CSPRNG.
- **Concurrencia y ritmo humano** — grupo de trabajadores con pausas aleatorias.
- **Reintentos automáticos** — opcionalmente desde una IP nueva.
- **Capturas de fallos** — PNG de página completa por cada fallo.
- **Exportación completa** — `accounts.json`, `accounts.csv`, `keys.txt`, `summary.json`.

## Inicio rápido

```bash
git clone https://github.com/<tu-usuario>/liquid-bulk-creator.git
cd liquid-bulk-creator
npm install

node src/index.js --count 5
```

Los resultados se guardan en `accounts/`.

## Requisitos

- **Node.js 18+**
- **Playwright Chromium** (se instala con `npm install`)
- Acceso HTTPS a `console.liquid.ai`, `clerk.console.liquid.ai`,
  `challenges.cloudflare.com` y `www.emailnator.com`
- *(Recomendado)* proxies rotativos más allá de unas pocas cuentas

## Uso

```bash
node src/index.js -n 20 -c 4

node src/index.js -n 6 --proxy http://user:pass@1.2.3.4:8000 --proxy http://user:pass@5.6.7.8:8000

export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}&country=us'
node src/index.js -n 50 -c 5
```

## 🔄 Proxies rotativos

**Estrategia A — lista estática (round-robin):**

```bash
export LBC_PROXIES='http://user:pass@1.2.3.4:8000,http://user:pass@5.6.7.8:8000'
```

**Estrategia B — plantilla de pasarela rotativa (una IP nueva por cuenta):**

```bash
export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}'
```

`{session}` genera un valor aleatorio nuevo por cuenta; `{index}` y `{country}`
también son compatibles.

| Variable | Predeterminado | Significado |
|---|---|---|
| `LBC_PROXIES` | – | Lista de proxies separada por comas |
| `LBC_PROXY_TEMPLATE` | – | URL con `{session}` / `{index}` / `{country}` |
| `LBC_PROXY_ROTATE` | `true` | Nueva sesión por cuenta |
| `LBC_PROXY_ROTATE_ON_FAILURE` | `true` | Reintentar con otra IP |
| `LBC_PROXY_COUNTRY` | – | Código de país para `{country}` |

## Variables de entorno

| Variable | Predeterminado | Significado |
|---|---|---|
| `LBC_COUNT` | `1` | Cuentas a crear |
| `LBC_CONCURRENCY` | `2` | Trabajadores en paralelo |
| `LBC_MIN_DELAY_MS` / `LBC_MAX_DELAY_MS` | `4000` / `12000` | Pausa entre cuentas |
| `LBC_MAX_RETRIES` | `3` | Reintentos por cuenta |
| `LBC_HEADLESS` | `true` | Sin ventana visible |
| `LBC_CODE_TIMEOUT_MS` | `180000` | Espera del código por correo |
| `LBC_OUTPUT_DIR` | `accounts` | Carpeta de resultados |

## Cómo funciona

| Etapa | Módulo | Qué ocurre |
|---|---|---|
| Orquestación | `src/index.js` | CLI, grupo de trabajadores, reintentos |
| Rotación | `src/proxy.js` | Asigna / rota la salida por cuenta |
| Bandeja | `src/emailnator.js` | Genera la dirección y busca el código |
| Automatización | `src/liquid.js` | Registro → verificación → clave |
| Secretos | `src/util.js` | Contraseñas y nombres aleatorios |
| Exportación | `src/output.js` | JSON / CSV / keys.txt / resumen |

**¿Por qué un navegador?** Liquid Console usa Clerk, cuya protección Turnstile
genera el token dentro de la página; no hay forma honesta de automatizarlo con
HTTP puro. Un Chromium real es más simple y fiable.

## Solución de problemas

| Síntoma | Solución |
|---|---|
| Atascado en "Just a moment" | Añade proxies residenciales/móviles; usa `--headful` |
| "email address already in use" | Normal — se reintenta con otra bandeja |
| Sin código de verificación | Sube `LBC_CODE_TIMEOUT_MS` |
| Muchos fallos desde una IP | Activa `LBC_PROXY_ROTATE_ON_FAILURE` |
| Falta Chromium | `npx playwright install chromium` |

## Uso legal y responsable

Herramienta con fines **educativos y de investigación en automatización**.
Eres responsable de cumplir los términos de servicio de Liquid AI, Clerk y
emailnator, y las leyes aplicables. No la uses para abusar, enviar spam ni
sobrecargar servicios.

## Licencia

[MIT](../LICENSE)
