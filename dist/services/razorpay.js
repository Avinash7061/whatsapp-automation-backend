"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = exports.createPaymentLink = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});
const createPaymentLink = async (amount, referenceId, customerPhone) => {
    try {
        const paymentLink = await razorpay.paymentLink.create({
            amount: Math.round(amount * 100), // Razorpay expects amount in paise (smallest currency unit)
            currency: 'INR',
            accept_partial: false,
            reference_id: referenceId,
            description: `Order ${referenceId}`,
            customer: {
                contact: customerPhone
            },
            notify: {
                sms: false, // We will notify via WhatsApp ourselves
                email: false
            },
            reminder_enable: true,
            callback_url: 'https://google.com', // Replace with a real success page later
            callback_method: 'get'
        });
        return paymentLink;
    }
    catch (error) {
        console.error('Error creating Razorpay payment link:', error);
        throw error;
    }
};
exports.createPaymentLink = createPaymentLink;
const verifyWebhookSignature = (body, signature) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const expectedSignature = crypto_1.default.createHmac('sha256', secret).update(body).digest('hex');
    return expectedSignature === signature;
};
exports.verifyWebhookSignature = verifyWebhookSignature;
