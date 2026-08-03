import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

export const twilioClient =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Converts a phone number string into E.164 format (+1 followed by 10 digits).
 */
export function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (phone.trim().startsWith("+")) {
    return `+${digits}`;
  }
  return `+1${digits}`;
}

/**
 * Sends an automated SMS message via Twilio.
 * @param to Phone number (will be converted to E.164 format)
 * @param body Message text
 */
export async function sendSms(to: string, body: string) {
  if (!accountSid || !authToken || !fromPhone || !twilioClient) {
    console.warn(
      "Twilio SMS skipped: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER not configured in environment variables."
    );
    return null;
  }

  try {
    const formattedTo = formatE164(to);
    const message = await twilioClient.messages.create({
      body,
      from: fromPhone,
      to: formattedTo,
    });
    console.log(`Twilio SMS successfully sent to ${formattedTo}. SID: ${message.sid}`);
    return message;
  } catch (error: any) {
    console.error("Twilio SMS delivery error:", error);
    return null;
  }
}
