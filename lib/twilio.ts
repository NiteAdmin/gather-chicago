import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

export const twilioClient =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Sends an automated SMS message via Twilio.
 * @param to E.164 formatted phone number (e.g. +13125550199)
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
    const message = await twilioClient.messages.create({
      body,
      from: fromPhone,
      to,
    });
    console.log(`Twilio SMS successfully sent to ${to}. SID: ${message.sid}`);
    return message;
  } catch (error: any) {
    console.error("Twilio SMS delivery error:", error);
    return null;
  }
}
