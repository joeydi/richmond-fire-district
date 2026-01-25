import twilio from "twilio";

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface SmsOptions {
  to: string;
  body: string;
}

/**
 * Send an SMS using Twilio
 */
export async function sendSms(
  options: SmsOptions
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!client || !fromNumber) {
    console.warn("Twilio not configured, skipping SMS");
    return { success: false, error: "SMS service not configured" };
  }

  try {
    const message = await client.messages.create({
      body: options.body,
      from: fromNumber,
      to: options.to,
    });

    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error("Twilio error:", error);
    const message = error instanceof Error ? error.message : "Failed to send SMS";
    return { success: false, error: message };
  }
}

/**
 * Send a new log post notification SMS
 */
export async function sendNewLogPostSms(
  to: string,
  logPost: {
    title: string;
    createdBy: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const body = `Richmond Fire District: New log entry "${logPost.title}" posted by ${logPost.createdBy}`;

  return sendSms({ to, body });
}

/**
 * Send a missing reading alert SMS
 */
export async function sendMissingReadingSms(
  to: string,
  readingType: "meter" | "chlorine",
  daysSinceLastReading: number
): Promise<{ success: boolean; error?: string }> {
  const typeLabel = readingType === "meter" ? "meter" : "chlorine";
  const body = `Richmond Fire District Alert: No ${typeLabel} reading recorded for ${daysSinceLastReading} day${daysSinceLastReading === 1 ? "" : "s"}. Please log readings.`;

  return sendSms({ to, body });
}
