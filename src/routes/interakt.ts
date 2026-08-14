import { Router, Request, Response } from 'express';
import { sendTextMessage } from '../services/interakt';
import { getProducts } from '../services/shopify';
import { getOrCreateCart, clearCart } from '../services/cart';
import { createDraftOrder } from '../services/shopifyAdmin';
import { createPaymentLink } from '../services/razorpay';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Endpoint for receiving messages from Interakt
router.post('/', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const data = payload?.data;
    
    if (data && data.message && data.customer) {
      const phoneNumber = data.customer.phone_number;
      const text = (data.message.message?.text || data.message.message?.title || '').toLowerCase().trim();
      
      if (phoneNumber && text) {
        console.log(`Received message from ${phoneNumber}: ${text}`);
        
        if (text === 'browse') {
          // Fetch catalog
          const products = await getProducts(3);
          const productList = products.map((p: any) => `- ${p.title} (${p.variants.edges[0].node.price.currencyCode} ${p.variants.edges[0].node.price.amount})`).join('\\n');
          await sendTextMessage(phoneNumber, `Here are our products:\\n${productList}\\n\\n(Reply with "add [Product Name]" to add to cart)`);
        } else if (text === 'cart') {
          // View cart
          const cart = await getOrCreateCart(phoneNumber);
          if (!cart || !cart.items || (cart.items as any[]).length === 0) {
             await sendTextMessage(phoneNumber, 'Your cart is empty.');
          } else {
             const itemsList = (cart.items as any[]).map((i: any) => `${i.quantity}x ${i.title} - ${i.price}`).join('\\n');
             await sendTextMessage(phoneNumber, `Your Cart:\\n${itemsList}\\n\\nTotal: ${cart.totalAmount}\\n\\nReply "checkout" to pay.`);
          }
        } else if (text === 'checkout') {
          // Checkout Flow
          const cart = await getOrCreateCart(phoneNumber);
          if (!cart || !cart.items || (cart.items as any[]).length === 0) {
             await sendTextMessage(phoneNumber, 'Your cart is empty. Nothing to checkout.');
          } else {
             await sendTextMessage(phoneNumber, 'Generating your payment link, please wait...');
             
             try {
                 // 1. Create Shopify Draft Order
                 const draftOrder = await createDraftOrder(cart.items as any[], phoneNumber);
                 
                 // 2. Save Order in DB
                 const order = await prisma.order.create({
                   data: {
                     customerId: cart.customerId,
                     shopifyDraftOrderId: draftOrder.id.toString(),
                     amount: cart.totalAmount,
                     status: 'PENDING'
                   }
                 });

                 // 3. Create Razorpay Payment Link
                 const paymentLink = await createPaymentLink(cart.totalAmount, order.id, phoneNumber);

                 // 4. Update Order with Payment Link ID
                 await prisma.order.update({
                   where: { id: order.id },
                   data: { razorpayPaymentLinkId: paymentLink.id }
                 });

                 // 5. Send Link to user
                 await sendTextMessage(phoneNumber, `Your order is ready!\\nTotal: ₹${cart.totalAmount}\\n\\nPay here to complete your order:\\n${paymentLink.short_url}`);
             } catch (checkoutError) {
                 console.error('Checkout failed:', checkoutError);
                 await sendTextMessage(phoneNumber, 'Sorry, we encountered an issue preparing your checkout. Please try again in a few minutes.');
             }
          }
        } else {
          // Default Echo/Help
          await sendTextMessage(phoneNumber, `Welcome to the Store!\\nReply "browse" to see products.\\nReply "cart" to view your cart.`);
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling Interakt webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
