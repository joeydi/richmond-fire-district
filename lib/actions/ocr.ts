"use server";

export interface OCRResult {
  reading: string | null;
  rawText: string;
  error?: string;
}

export async function extractMeterReading(
  imageBase64: string
): Promise<OCRResult> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

  if (!apiKey) {
    return {
      reading: null,
      rawText: "",
      error: "Google Cloud Vision API key not configured",
    };
  }

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        reading: null,
        rawText: "",
        error: errorData.error?.message || "API request failed",
      };
    }

    const data = await response.json();
    const text =
      data.responses?.[0]?.textAnnotations?.[0]?.description || "";

    // Extract numeric reading from detected text
    // Match numbers with optional commas and decimal point
    const match = text.match(/[\d,]+\.?\d*/);
    const reading = match ? match[0].replace(/,/g, "") : null;

    return { reading, rawText: text };
  } catch (err) {
    return {
      reading: null,
      rawText: "",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
