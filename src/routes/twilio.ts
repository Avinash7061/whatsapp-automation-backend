import { Router, Request, Response } from 'express';
import { sendWhatsAppMessage } from '../services/twilio';
import { generateAIResponse } from '../services/ai';
import { getShopifyProducts } from '../services/shopify';
import { getOrCreateCart, addItemToCart, getCart, clearCart } from '../services/cart';
import { createDraftOrder } from '../services/shopifyAdmin';
import { createPaymentLink } from '../services/razorpay';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Twilio webhooks are sent as URL-encoded forms (application/x-www-form-urlencoded)
// Ensure express.urlencoded({ extended: true }) is used in index.ts!

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { Body, From } = req.body;

    if (!Body || !From) {
      res.status(400).send('Missing Body or From');
      return;
    }

    // Twilio 'From' looks like 'whatsapp:+919876543210'
    const customerPhone = From.replace('whatsapp:', '');
    const messageText = Body.trim().toLowerCase();

    // Acknowledge the webhook immediately so Twilio doesn't retry
    res.status(200).send('OK');

    // Run the actual logic asynchronously
    processMessage(customerPhone, messageText).catch(err => {
      console.error('Error processing Twilio message:', err);
    });

  } catch (error) {
    console.error('Error parsing Twilio webhook:', error);
    res.status(500).send('Server Error');
  }
});

async function processMessage(phone: string, text: string) {
  try {
    // 1. Browse Command
    if (text === 'browse') {
      const products = await getShopifyProducts();
      let responseText = "*Welcome to our Store!* 🛍️\n\nHere are our products:\n";
      
      products.forEach(p => {
        const productId = p.id.split('/').pop();
        responseText += `\n*${p.title}* - Rs ${p.price}\nTo buy, reply: cart ${productId}\n`;
      });
      
      await sendWhatsAppMessage(phone, responseText);
      return;
    }

    // 2. Cart Command
    if (text.startsWith('cart ')) {
      const productId = text.split(' ')[1];
      if (!productId) {
        await sendWhatsAppMessage(phone, "Please specify a product ID. Example: *cart 12345*");
        return;
      }

      // Check if product exists in Shopify
      const products = await getShopifyProducts();
      const product = products.find(p => p.id.endsWith(productId));
      
      if (!product) {
        await sendWhatsAppMessage(phone, "Sorry, I couldn't find that product ID. Reply *browse* to see the list.");
        return;
      }

      const cart = await getOrCreateCart(phone);
      await addItemToCart(cart.id, product.id, product.title, product.price);
      
      await sendWhatsAppMessage(phone, `✅ Added *${product.title}* to your cart!\n\nReply *checkout* to pay, or *browse* to add more items.`);
      return;
    }

    // 3. Checkout Command
    if (text === 'checkout') {
      const cart = await getCart(phone);
      
      if (!cart || cart.items.length === 0) {
        await sendWhatsAppMessage(phone, "Your cart is empty! Reply *browse* to see products.");
        return;
      }

      await sendWhatsAppMessage(phone, "⏳ Creating your secure checkout link...");

      // Total amount
      const totalAmount = cart.items.reduce((sum, item) => sum + item.price, 0);

      // Create Draft Order in Shopify
      const draftOrderId = await createDraftOrder(cart);

      // Create a pending Order in our DB
      const dbOrder = await prisma.order.create({
        data: {
          customerId: cart.customerId,
          shopifyDraftId: draftOrderId,
          totalAmount: totalAmount,
          status: 'PENDING'
        }
      });

      // Create Razorpay Link (must be in paise, so multiply by 100)
      const amountInPaise = totalAmount * 100;
      const paymentLink = await createPaymentLink(amountInPaise, dbOrder.id, "Order Payment");

      // Clear the cart
      await clearCart(phone);

      await sendWhatsAppMessage(phone, `*Your order is ready!* 💳\n\nTotal: Rs ${totalAmount}\n\nPlease click the link below to pay securely via UPI, Card, or NetBanking:\n${paymentLink.short_url}`);
      return;
    }

    // 4. Default: Let the AI answer the query!
    const aiResponse = await generateAIResponse(text, phone);
    await sendWhatsAppMessage(phone, aiResponse);

  } catch (error: any) {
    console.error("Error in processMessage logic:", error);
    await sendWhatsAppMessage(phone, "Sorry, something went wrong on our end. Please try again later!");
  }
}

export default router;
