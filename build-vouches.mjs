#!/usr/bin/env node
/**
 * Rebuilds the Vouches wall in index.html from vouches.json.
 *
 * vouches.json is the source of truth. Each entry supplies the person's name,
 * what they said, when they said it, and the screenshot that proves it. The
 * screenshots themselves live in vouches/ and are opened on click.
 *
 * Entries appear in the order they are listed in vouches.json.
 *
 * Usage:  node build-vouches.mjs
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const VOUCH_DIR = join(ROOT, "vouches");
const DATA_FILE = join(ROOT, "vouches.json");
const INDEX_FILE = join(ROOT, "index.html");

const START = "<!-- VOUCHES:START -->";
const END = "<!-- VOUCHES:END -->";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

/** Escape text for safe use in HTML. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Encode a path for use in a URL while keeping "/" intact. */
function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

/** Every image file sitting in vouches/. */
function listScreenshots() {
  try {
    return readdirSync(VOUCH_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .filter((entry) => !entry.name.startsWith(".") && !entry.name.startsWith("_"))
      .filter((entry) => IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function loadVouches() {
  if (!existsSync(DATA_FILE)) {
    console.error("Could not find vouches.json next to index.html. Aborting.");
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    console.error(`vouches.json is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  if (!Array.isArray(parsed)) {
    console.error("vouches.json must contain an array of vouch objects.");
    process.exit(1);
  }

  return parsed;
}

function renderWall(vouches) {
  if (vouches.length === 0) {
    return [
      '      <p class="empty">',
      "        No vouches yet &mdash; add entries to <code>vouches.json</code> and run",
      "        <code>node build-vouches.mjs</code>.",
      "      </p>",
    ].join("\n");
  }

  return vouches
    .map((vouch) => {
      const name = escapeHtml(vouch.name || "Anonymous");
      const date = vouch.date ? escapeHtml(vouch.date) : "";
      const text = escapeHtml(vouch.text || "").replace(/\n/g, "<br />");
      const shot = vouch.shot ? `vouches/${vouch.shot}` : "";

      const lines = [
        `      <button class="vouch" type="button" data-name="${name}"${
          shot ? ` data-shot="${escapeHtml(encodePath(shot))}"` : ""
        } aria-label="Show the original screenshot of ${name}&rsquo;s vouch">`,
        '        <span class="vouch-head">',
        `          <span class="vouch-name">${name}</span>`,
        date ? `          <span class="vouch-date">${date}</span>` : "",
        "        </span>",
        `        <span class="vouch-bubble">${text}</span>`,
        shot ? '        <span class="vouch-proof">View screenshot</span>' : "",
        "      </button>",
      ].filter(Boolean);

      return lines.join("\n");
    })
    .join("\n");
}

function main() {
  const html = readFileSync(INDEX_FILE, "utf8");
  const start = html.indexOf(START);
  const end = html.indexOf(END);

  if (start === -1 || end === -1 || end < start) {
    console.error(
      `Could not find the ${START} / ${END} markers in index.html. Aborting so nothing is overwritten.`
    );
    process.exit(1);
  }

  const vouches = loadVouches();
  const wall = renderWall(vouches);
  const updated =
    html.slice(0, start + START.length) + "\n" + wall + "\n" + html.slice(end);

  if (updated !== html) {
    writeFileSync(INDEX_FILE, updated);
  }

  console.log(`Rendered ${vouches.length} vouch${vouches.length === 1 ? "" : "es"}.`);
  vouches.forEach((vouch, index) => {
    const shot = vouch.shot || "(no screenshot)";
    console.log(`  ${index + 1}. ${vouch.name || "Anonymous"} \u2014 ${shot}`);
  });

  // Flag anything that will not show up, so silent mistakes are impossible.
  const onDisk = listScreenshots();
  const referenced = new Set(vouches.map((vouch) => vouch.shot).filter(Boolean));
  const missing = [...referenced].filter((shot) => !onDisk.includes(shot));
  const unused = onDisk.filter((file) => !referenced.has(file));

  if (missing.length) {
    console.log("\nWARNING - referenced but not found in vouches/:");
    missing.forEach((file) => console.log(`  \u2717 ${file}`));
  }
  if (unused.length) {
    console.log("\nNot used by any vouch in vouches.json (safe to delete):");
    unused.forEach((file) => console.log(`  \u2022 ${file}`));
  }

  console.log(`\nindex.html ${updated === html ? "already up to date." : "updated."}`);
  if (missing.length) process.exitCode = 1;
}

main();
