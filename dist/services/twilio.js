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
/**
 * Lazily initialize Twilio client only when valid credentials starting with 'AC' exist
 */
function getTwilioClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    if (!accountSid || !authToken || !accountSid.startsWith('AC')) {
        return null;
    }
    try {
        return (0, twilio_1.default)(accountSid, authToken);
    }
    catch (err) {
        console.error('Failed to initialize Twilio client:', err?.message);
        return null;
    }
}
/**
 * Format phone number for Twilio's WhatsApp API
 */
function formatWhatsAppNumber(phone) {
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
        const client = getTwilioClient();
        if (!client) {
            console.warn('⚠️ Twilio is not configured yet. Make sure TWILIO_ACCOUNT_SID (starts with AC) and TWILIO_AUTH_TOKEN are set in Render Environment variables.');
            console.log(`[Would send to ${toPhone}]:\n${text}`);
            return;
        }
        const formattedTo = formatWhatsAppNumber(toPhone);
        const twilioNumber = process.env.TWILIO_PHONE_NUMBER?.trim() || '';
        if (!twilioNumber) {
            console.warn('⚠️ TWILIO_PHONE_NUMBER is not set in Environment variables.');
            return;
        }
        await client.messages.create({
            body: text,
            from: twilioNumber.startsWith('whatsapp:') ? twilioNumber : `whatsapp:${twilioNumber}`,
            to: formattedTo
        });
        console.log(`Twilio: Successfully sent message to ${formattedTo}`);
    }
    catch (error) {
        console.error('Error sending Twilio message:', error?.message || error);
    }
}
/**
 * Send a WhatsApp template (e.g., for shipping confirmation)
 */
async function sendTemplateMessage(toPhone, templateName, variables) {
    try {
        const formattedTo = formatWhatsAppNumber(toPhone);
        console.log(`[Twilio] Processing template '${templateName}' to ${formattedTo} with vars`, variables);
        const message = `*Shipping Update!*\nYour order has shipped via ${variables['1'] || 'the carrier'}.\nTracking: ${variables['2'] || 'N/A'}\nTrack here: ${variables['3'] || 'N/A'}`;
        await sendWhatsAppMessage(toPhone, message);
    }
    catch (error) {
        console.error('Error sending Twilio template:', error?.message || error);
    }
}
