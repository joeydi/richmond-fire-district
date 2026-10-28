/**
 * Meter Photo OCR Test
 *
 * Sends meter photos to Cloudflare's Clairic extraction model and prints the
 * reading it finds in each one.
 *
 * Usage:
 *   npx tsx scripts/test-meter-ocr.ts photo1.jpg [photo2.jpg ...]
 *   npx tsx scripts/test-meter-ocr.ts --previous 1234567 photo.jpg
 *   npx tsx scripts/test-meter-ocr.ts --json photo.jpg
 *
 * Options:
 *   --previous <n>  Last known reading, given to the model as context
 *   --json          Print the raw API response
 *
 * Environment (optional; without a token it runs through the `cf` CLI's login):
 *   CLOUDFLARE_ACCOUNT_ID - Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN  - API token with Workers AI read permission
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { execFile } from "child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, join } from "path";
import { promisify } from "util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

const MODEL = "@cf/cloudflare/clairic";
// Clairic accepts images up to 4 MiB; phone photos are resized well under that
const MAX_DIMENSION = 2000;

// Text fields answer with spans of `state`, so they can't transcribe the photo;
// only typed values like numbers are read from the image itself
const FIELDS = {
  reading: {
    type: "number",
    decimals: 2,
    instructions:
      "The total volume shown on the water meter's register (an LCD display or odometer-style wheels), read left to right. The reading always has exactly 2 decimal places: the last two digits on the display are hundredths, even if the decimal point is hard to see. Ignore the serial number, barcode, model, size and dates.",
  },
};

interface ClairicAnswer {
  value: unknown;
  guess?: unknown;
  confidence?: number;
  p_null?: number;
}

interface ClairicResponse {
  answers: Record<string, ClairicAnswer>;
  state_text?: string;
  truncated?: boolean;
  usage?: Record<string, number>;
}

function parseArgs(argv: string[]) {
  const files: string[] = [];
  let previous: string | undefined;
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--previous") {
      previous = argv[++i];
    } else if (arg === "--json") {
      json = true;
    } else {
      files.push(arg);
    }
  }

  return { files, previous, json };
}

async function encodeImage(path: string): Promise<string> {
  // rotate() applies EXIF orientation so the register reads upright
  const buffer = await sharp(readFileSync(path))
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

async function runWithToken(request: object): Promise<ClairicResponse> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );

  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(body.errors ?? body)}`);
  }

  return body.result ?? body;
}

// Falls back to the Cloudflare CLI's own login when no API token is set
async function runWithCli(request: object): Promise<ClairicResponse> {
  const dir = mkdtempSync(join(tmpdir(), "meter-ocr-"));
  const bodyPath = join(dir, "request.json");
  writeFileSync(bodyPath, JSON.stringify(request));

  try {
    const { stdout } = await execFileAsync("cf", ["ai", "run", MODEL, "--quiet", "--body", `@${bodyPath}`], {
      maxBuffer: 16 * 1024 * 1024,
    });
    const body = JSON.parse(stdout);
    return body.result ?? body;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function readMeter(path: string, previous?: string): Promise<ClairicResponse> {
  const state = [
    "Photo of a water meter taken during a daily round.",
    previous && `The previous reading was ${previous}; the new reading should be equal or higher.`,
  ]
    .filter(Boolean)
    .join(" ");

  const request = {
    model: "clairic",
    state,
    images: [await encodeImage(path)],
    fields: FIELDS,
  };

  return process.env.CLOUDFLARE_API_TOKEN ? runWithToken(request) : runWithCli(request);
}

function formatAnswer(answer: ClairicAnswer | undefined): string {
  if (!answer) return "—";
  const value = answer.value ?? `null (guess: ${answer.guess ?? "—"})`;
  const confidence = answer.confidence !== undefined ? ` · confidence ${answer.confidence.toFixed(2)}` : "";
  const pNull = answer.p_null !== undefined ? ` · p_null ${answer.p_null.toFixed(2)}` : "";
  return `${value}${confidence}${pNull}`;
}

async function main() {
  const { files, previous, json } = parseArgs(process.argv.slice(2));

  if (files.length === 0) {
    console.error("Usage: npx tsx scripts/test-meter-ocr.ts [--previous <n>] [--json] <photo> [photo ...]");
    process.exit(1);
  }
  if (process.env.CLOUDFLARE_API_TOKEN && !process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.error("❌ Set CLOUDFLARE_ACCOUNT_ID alongside CLOUDFLARE_API_TOKEN in .env.local");
    process.exit(1);
  }

  for (const file of files) {
    const started = Date.now();
    try {
      const result = await readMeter(file, previous);
      const elapsed = Date.now() - started;

      if (json) {
        console.log(JSON.stringify(result, null, 2));
        continue;
      }

      console.log(`\n📷 ${basename(file)} (${elapsed} ms)`);
      console.log(`   reading:  ${formatAnswer(result.answers.reading)}`);
      if (result.usage) {
        console.log(`   tokens:   ${result.usage.input_tokens} in (${result.usage.image_tokens} image)`);
      }
    } catch (error) {
      console.error(`\n❌ ${basename(file)}: ${(error as Error).message}`);
    }
  }
}

main();
