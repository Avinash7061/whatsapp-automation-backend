"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppMessage = sendWhatsAppMessage;
exports.sendTemplateMessage = sendTemplateMessage;
const twilio_1 = __importDefault(require("twilio"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const client = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '';
/**
 * Format phone number for Twilio's WhatsApp API
 */
function formatWhatsAppNumber(phone) {
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
async function sendWhatsAppMessage(toPhone, text) {
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
    }
    catch (error) {
        console.error('Error sending Twilio message:', error?.message);
    }
}
/**
 * Send a WhatsApp template (e.g., for shipping confirmation)
 * Note: Twilio handles templates either via Content API or by exact string matching.
 * For simplicity in this demo, if it's an unapproved template it will just send a formatted text.
 */
async function sendTemplateMessage(toPhone, templateName, variables) {
    try {
        const formattedTo = formatWhatsAppNumber(toPhone);
        console.log(`[Twilio] Simulating template '${templateName}' to ${formattedTo} with vars`, variables);
        // In production with Twilio, you would use Content API (ContentSid)
        // For now, we fallback to a standard message.
        const message = `*Shipping Update!*\nYour order has shipped via ${variables['1']}.\nTracking: ${variables['2']}\nTrack here: ${variables['3']}`;
        await sendWhatsAppMessage(toPhone, message);
    }
    catch (error) {
        console.error('Error sending Twilio template:', error?.message);
    }
}
