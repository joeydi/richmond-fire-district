import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Prompt and model were compared against Clairic in scripts/test-meter-ocr-claude.ts;
// keep them in step when tuning
const MODEL = "claude-haiku-5-5";

const MeterReadingSchema = z.object({
  digits: z.string().describe("Every character on the register display exactly as shown, including the decimal point"),
  reading: z.number().nullable().describe("The register total as a number, or null if it can't be read"),
  unit: z.string().nullable().describe("The unit printed on the meter, such as Gal or ft³"),
  legible: z.boolean().describe("False if any digit is blurred, obscured or ambiguous"),
});

const PROMPT = `This is a photo of a water meter taken during a daily round. Read the total volume on its register (an LCD display or odometer-style wheels), left to right, including any decimal digits. Ignore the serial number, barcode, model, size and dates.

The reading always has exactly 2 decimal places: the last two digits on the display are hundredths, even if the decimal point is hard to see.

Report only what the display shows. If a digit is unclear, give your best reading and set legible to false.`;

export type MeterPhotoReading = z.infer<typeof MeterReadingSchema>;

export type MeterImageType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Reads the register total from a meter photo. Returns null when the model
 * declines or its output doesn't parse; API errors are thrown.
 */
export async function readMeterImage(
  base64: string,
  mediaType: MeterImageType
): Promise<MeterPhotoReading | null> {
  const client = new Anthropic();

  const response = await client.messages.parse({
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
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") return null;
  return response.parsed_output;
}
