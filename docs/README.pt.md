<div align="center">

<img src="../assets/logo.svg" alt="Liquid Bulk Creator" width="150" />

# Liquid Bulk Creator

**Crie contas verificadas do Liquid Console em massa — cada uma com sua própria chave de API de nome aleatório — com um único comando.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.49-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?style=flat-square)](../LICENSE)
[![Platform](https://img.shields.io/badge/Plataforma-Liquid%20AI-6C47FF?style=flat-square)](https://console.liquid.ai/)
[![Inbox](https://img.shields.io/badge/Caixa-emailnator-F59E0B?style=flat-square)](https://www.emailnator.com/)
[![Proxy](https://img.shields.io/badge/Proxy-Rotativo-06B6D4?style=flat-square)](#-proxies-rotativos)
[![Status](https://img.shields.io/badge/Status-Ativo-22C55E?style=flat-square)]()

[English](../README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [日本語](README.ja.md) · [中文](README.zh.md)

</div>

---

## Visão geral

O **Liquid Bulk Creator** automatiza todo o processo de cadastro do Liquid
Console. Para cada conta ele:

1. atribui o próximo **proxy rotativo** (opcional, mas recomendado);
2. cria uma caixa real `@gmail.com` no **emailnator**;
3. cadastra em `console.liquid.ai` por um **Chromium headless real**
   (assim o Cloudflare Turnstile do Clerk passa como passaria para uma pessoa);
4. lê o código de verificação de 6 dígitos da caixa e verifica;
5. aguarda o espaço de trabalho criado automaticamente;
6. gera uma **chave de API com nome aleatório** e captura seu valor.

Tudo é gravado em disco. Sem banco de dados, sem painel, sem conta na nuvem.

## Recursos

- **Um comando, qualquer quantidade** — `-n 100` cria cem contas verificadas.
- **Caixas Gmail reais** — endereços `@gmail.com` que passam pelos filtros.
- **Autenticação fiel ao navegador** — Playwright usa a interface real.
- **Proxies rotativos** — listas round-robin ou sessões fixas por conta.
- **Nomes de chave aleatórios e legíveis** — `key-cobalt-falcon-4f2a`.
- **Senhas fortes** — geradas com CSPRNG.
- **Concorrência e ritmo humano** — pool de workers com pausas aleatórias.
- **Repetições automáticas** — opcionalmente com um IP novo.
- **Capturas de falhas** — PNG de página inteira a cada erro.
- **Exportação completa** — `accounts.json`, `accounts.csv`, `keys.txt`, `summary.json`.

## Início rápido

```bash
git clone https://github.com/<seu-usuario>/liquid-bulk-creator.git
cd liquid-bulk-creator
npm install

node src/index.js --count 5
```

Os resultados ficam em `accounts/`.

## Requisitos

- **Node.js 18+**
- **Playwright Chromium** (instalado por `npm install`)
- Acesso HTTPS a `console.liquid.ai`, `clerk.console.liquid.ai`,
  `challenges.cloudflare.com` e `www.emailnator.com`
- *(Recomendado)* proxies rotativos para mais que algumas contas

## Uso

```bash
node src/index.js -n 20 -c 4

node src/index.js -n 6 --proxy http://user:pass@1.2.3.4:8000 --proxy http://user:pass@5.6.7.8:8000

export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}&country=br'
node src/index.js -n 50 -c 5
```

## 🔄 Proxies rotativos

**Estratégia A — lista estática (round-robin):**

```bash
export LBC_PROXIES='http://user:pass@1.2.3.4:8000,http://user:pass@5.6.7.8:8000'
```

**Estratégia B — template de gateway rotativo (um IP novo por conta):**

```bash
export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}'
```

`{session}` gera um valor aleatório por conta; `{index}` e `{country}` também
são suportados.

| Variável | Padrão | Significado |
|---|---|---|
| `LBC_PROXIES` | – | Lista de proxies separada por vírgulas |
| `LBC_PROXY_TEMPLATE` | – | URL com `{session}` / `{index}` / `{country}` |
| `LBC_PROXY_ROTATE` | `true` | Nova sessão por conta |
| `LBC_PROXY_ROTATE_ON_FAILURE` | `true` | Repetir com outro IP |
| `LBC_PROXY_COUNTRY` | – | Código do país para `{country}` |

## Variáveis de ambiente

| Variável | Padrão | Significado |
|---|---|---|
| `LBC_COUNT` | `1` | Contas a criar |
| `LBC_CONCURRENCY` | `2` | Workers em paralelo |
| `LBC_MIN_DELAY_MS` / `LBC_MAX_DELAY_MS` | `4000` / `12000` | Pausa entre contas |
| `LBC_MAX_RETRIES` | `3` | Repetições por conta |
| `LBC_HEADLESS` | `true` | Sem janela visível |
| `LBC_CODE_TIMEOUT_MS` | `180000` | Espera pelo código |
| `LBC_OUTPUT_DIR` | `accounts` | Pasta de resultados |

## Como funciona

| Etapa | Módulo | O que acontece |
|---|---|---|
| Orquestração | `src/index.js` | CLI, pool, repetições |
| Rotação | `src/proxy.js` | Atribui / rotaciona a saída |
| Caixa | `src/emailnator.js` | Gera o endereço e busca o código |
| Automação | `src/liquid.js` | Cadastro → verificação → chave |
| Segredos | `src/util.js` | Senhas e nomes aleatórios |
| Exportação | `src/output.js` | JSON / CSV / keys.txt / resumo |

**Por que um navegador?** O Liquid Console usa Clerk, cuja proteção Turnstile
gera o token dentro da página; não há forma honesta de automatizar com HTTP puro.

## Solução de problemas

| Sintoma | Correção |
|---|---|
| Preso em "Just a moment" | Use proxies residenciais/móveis; rode `--headful` |
| "email address already in use" | Normal — repete com outra caixa |
| Sem código de verificação | Aumente `LBC_CODE_TIMEOUT_MS` |
| Muitas falhas de um IP | Ative `LBC_PROXY_ROTATE_ON_FAILURE` |
| Chromium ausente | `npx playwright install chromium` |

## Uso legal e responsável

Ferramenta para fins **educacionais e de pesquisa em automação**. Você é
responsável por cumprir os termos de serviço do Liquid AI, Clerk e emailnator,
e as leis aplicáveis. Não a use para abusar, enviar spam ou sobrecarregar
serviços.

## Licença

[MIT](../LICENSE)
