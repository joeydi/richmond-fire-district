/**
 * Meter Photo OCR Test (Claude)
 *
 * Sends meter photos to Claude Haiku and prints the reading it finds in each
 * one. Takes the same arguments as scripts/test-meter-ocr.ts so the two can be
 * compared on the same photos.
 *
 * Usage:
 *   npx tsx scripts/test-meter-ocr-claude.ts photo1.jpg [photo2.jpg ...]
 *   npx tsx scripts/test-meter-ocr-claude.ts --previous 1662700 photo.jpg
 *   npx tsx scripts/test-meter-ocr-claude.ts --json photo.jpg
 *
 * Options:
 *   --previous <n>  Last known reading, given to the model as context
 *   --json          Print the raw parsed output and usage
 *
 * Environment:
 *   ANTHROPIC_API_KEY - Anthropic API key
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { readFileSync } from "fs";
import { basename } from "path";
import sharp from "sharp";
import { z } from "zod";

const MODEL = "claude-haiku-5-5";
// Haiku 5.5 pricing per million tokens (prompts under 100K tokens)
const INPUT_PRICE = 0.1;
const OUTPUT_PRICE = 0.5;
const MAX_DIMENSION = 2000;

const MeterReadingSchema = z.object({
  digits: z.string().describe("Every character on the register display exactly as shown, including the decimal point"),
  reading: z.number().nullable().describe("The register total as a number, or null if it can't be read"),
  unit: z.string().nullable().describe("The unit printed on the meter, such as Gal or ft³"),
  legible: z.boolean().describe("False if any digit is blurred, obscured or ambiguous"),
});

const PROMPT = `This is a photo of a water meter taken during a daily round. Read the total volume on its register (an LCD display or odometer-style wheels), left to right, including any decimal digits. Ignore the serial number, barcode, model, size and dates.

The reading always has exactly 2 decimal places: the last two digits on the display are hundredths, even if the decimal point is hard to see.

Report only what the display shows. If a digit is unclear, give your best reading and set legible to false.`;

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
  return buffer.toString("base64");
}

async function readMeter(client: Anthropic, path: string, previous?: string) {
  const text = previous
    ? `${PROMPT}\n\nThe previous reading was ${previous}; the new reading should be equal or higher.`
    : PROMPT;

  return client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: zodOutputFormat(MeterReadingSchema),
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: await encodeImage(path) },
          },
          { type: "text", text },
        ],
      },
    ],
  });
}

async function main() {
  const { files, previous, json } = parseArgs(process.argv.slice(2));

  if (files.length === 0) {
    console.error("Usage: npx tsx scripts/test-meter-ocr-claude.ts [--previous <n>] [--json] <photo> [photo ...]");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ Set ANTHROPIC_API_KEY in .env.local");
    process.exit(1);
  }

  const client = new Anthropic();

  for (const file of files) {
    const started = Date.now();
    try {
      const response = await readMeter(client, file, previous);
      const elapsed = Date.now() - started;
      const { input_tokens, output_tokens } = response.usage;
      const cost = (input_tokens * INPUT_PRICE + output_tokens * OUTPUT_PRICE) / 1_000_000;

      if (json) {
        console.log(JSON.stringify({ output: response.parsed_output, usage: response.usage }, null, 2));
        continue;
      }

      console.log(`\n📷 ${basename(file)} (${elapsed} ms)`);
      if (response.stop_reason === "refusal") {
        console.log(`   refused: ${response.stop_details?.category ?? "no category"}`);
        continue;
      }

      const output = response.parsed_output;
      if (!output) {
        console.log(`   no parsed output (stop_reason: ${response.stop_reason})`);
        continue;
      }

      console.log(`   reading:  ${output.reading ?? "null"}${output.legible ? "" : " · not fully legible"}`);
      console.log(`   digits:   ${output.digits}${output.unit ? ` ${output.unit}` : ""}`);
      console.log(`   tokens:   ${input_tokens} in, ${output_tokens} out · $${cost.toFixed(5)}`);
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        console.error("❌ Invalid ANTHROPIC_API_KEY");
        process.exit(1);
      } else if (error instanceof Anthropic.RateLimitError) {
        console.error(`\n❌ ${basename(file)}: rate limited, try again shortly`);
      } else if (error instanceof Anthropic.APIError) {
        console.error(`\n❌ ${basename(file)}: API error ${error.status}: ${error.message}`);
      } else {
        console.error(`\n❌ ${basename(file)}: ${(error as Error).message}`);
      }
    }
  }
}

main();
