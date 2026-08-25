import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '';

/**
 * Format phone number for Twilio's WhatsApp API
 */
function formatWhatsAppNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let cleanPhone = phone.replace(/[^\d+]/g, '');
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = '+' + cleanPhone;
  }
  if (!cleanPhone.startsWith('whatsapp:')) {
    return `whatsapp:${cleanPhone}`;
  }
  return cleanPhone;
}

/**
 * Send a standard text message via Twilio
 */
export async function sendWhatsAppMessage(toPhone: string, text: string) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log('Skipping Twilio send (no credentials). Message:', text);
      return;
    }
    
    const formattedTo = formatWhatsAppNumber(toPhone);
    
    await client.messages.create({
      body: text,
      from: twilioNumber,
      to: formattedTo
    });
    console.log(`Twilio: Sent message to ${formattedTo}`);
  } catch (error: any) {
    console.error('Error sending Twilio message:', error?.message);
  }
}

/**
 * Send a WhatsApp template (e.g., for shipping confirmation)
 * Note: Twilio handles templates either via Content API or by exact string matching.
 * For simplicity in this demo, if it's an unapproved template it will just send a formatted text.
 */
export async function sendTemplateMessage(toPhone: string, templateName: string, variables: Record<string, string>) {
  try {
    const formattedTo = formatWhatsAppNumber(toPhone);
    
    console.log(`[Twilio] Simulating template '${templateName}' to ${formattedTo} with vars`, variables);
    
    // In production with Twilio, you would use Content API (ContentSid)
    // For now, we fallback to a standard message.
    const message = `*Shipping Update!*\nYour order has shipped via ${variables['1']}.\nTracking: ${variables['2']}\nTrack here: ${variables['3']}`;
    
    await sendWhatsAppMessage(toPhone, message);
  } catch (error: any) {
    console.error('Error sending Twilio template:', error?.message);
  }
}
