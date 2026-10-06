#!/usr/bin/env bash
#
# Example runs for Liquid Bulk Creator.
# Copy the lines you need — this file is documentation, not an installer.

set -euo pipefail

# ── 1. Simplest possible run ─────────────────────────────────────────────────
# Create one verified account with its own API key.
node src/index.js --count 1


# ── 2. A small batch with moderate concurrency ───────────────────────────────
node src/index.js --count 10 --concurrency 3


# ── 3. Static rotating-proxy list (one IP per account, round-robin) ──────────
node src/index.js -n 8 \
  --proxy http://user:pass@1.2.3.4:8000 \
  --proxy http://user:pass@5.6.7.8:8000 \
  --proxy http://user:pass@9.10.11.12:8000


# ── 4. Rotating gateway with a fresh sticky session per account ──────────────
export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}'
export LBC_PROXY_ROTATE=true
export LBC_PROXY_ROTATE_ON_FAILURE=true
node src/index.js -n 50 -c 5


# ── 5. Target a specific country through the {country} placeholder ───────────
export LBC_PROXY_TEMPLATE='http://user:pass@gw.provider.com:8000?session={session}&country={country}'
export LBC_PROXY_COUNTRY=de
node src/index.js -n 20 -c 4


# ── 6. Debug a single account in a visible browser ───────────────────────────
node src/index.js -n 1 --headful


# ── 7. Feed the keys straight into another command ───────────────────────────
node src/index.js -n 5
while IFS=: read -r email key; do
  [ -z "$key" ] && continue
  echo "importing key for $email"
  # curl -s https://your-app.example.com/import -d "key=$key"
done < accounts/keys.txt
