"use strict";

/**
 * Small shared helpers: random credentials, human-like names and timing.
 */

const crypto = require("crypto");

const ADJECTIVES = [
  "swift", "brave", "calm", "clever", "cobalt", "crimson", "amber", "lucid",
  "noble", "quiet", "rapid", "silent", "solar", "vivid", "wired", "zen",
];
const NOUNS = [
  "falcon", "otter", "cedar", "comet", "harbor", "lumen", "nimbus", "orbit",
  "pixel", "quartz", "river", "sable", "tiger", "vertex", "willow", "zephyr",
];

const pick = (arr) => arr[crypto.randomInt(arr.length)];

/** Human-readable random API-key name, e.g. `key-cobalt-falcon-4f2a`. */
function randomKeyName() {
  return `key-${pick(ADJECTIVES)}-${pick(NOUNS)}-${crypto.randomBytes(2).toString("hex")}`;
}

/** Strong random password that satisfies the usual Clerk policy. */
function randomPassword(len = 18) {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+";
  const all = lower + upper + digits + symbols;
  const chars = [
    lower[crypto.randomInt(lower.length)],
    upper[crypto.randomInt(upper.length)],
    digits[crypto.randomInt(digits.length)],
    symbols[crypto.randomInt(symbols.length)],
  ];
  while (chars.length < len) chars.push(all[crypto.randomInt(all.length)]);
  // Fisher-Yates shuffle with a CSPRNG.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function jitter(min, max) {
  return crypto.randomInt(min, max + 1);
}

/** Random pause between `min` and `max` ms. */
const randomDelay = (min, max) => sleep(jitter(min, max));

module.exports = { randomKeyName, randomPassword, sleep, jitter, randomDelay };
