import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export const createPaymentLink = async (amount: number, referenceId: string, customerPhone: string) => {
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
  } catch (error) {
    console.error('Error creating Razorpay payment link:', error);
    throw error;
  }
};

export const verifyWebhookSignature = (body: string, signature: string) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return expectedSignature === signature;
};
