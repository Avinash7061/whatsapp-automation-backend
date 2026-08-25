import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from '../services/razorpay';
import { completeDraftOrder } from '../services/shopifyAdmin';
import { sendWhatsAppMessage } from '../services/twilio';
import { clearCart } from '../services/cart';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Endpoint for receiving webhooks from Razorpay
router.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    
    // In production, ensure req.body here is the raw string or use a middleware to capture it.
    // Assuming express.json() for this example but you may need rawBody.
    const bodyString = JSON.stringify(req.body);
    
    if (!verifyWebhookSignature(bodyString, signature)) {
      console.error('Invalid Razorpay Webhook Signature');
      return res.status(400).send('Invalid signature');
    }

    const eventId = req.headers['x-razorpay-event-id'] as string;
    const event = req.body?.event;
    console.log(`Received Razorpay Webhook [${event}] ID: ${eventId}`);
    
    // Respond immediately to Razorpay to prevent timeouts and retries
    res.status(200).send('OK');

    // Process the event asynchronously
    if (eventId) {
      processRazorpayEvent(eventId, event, req.body).catch(err => {
        console.error(`Error processing Razorpay event ${eventId}:`, err);
      });
    }
    
  } catch (error) {
    console.error('Error handling Razorpay webhook request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

async function processRazorpayEvent(eventId: string, event: string, payload: any) {
  // Idempotency check
  try {
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { id_provider: { id: eventId, provider: 'RAZORPAY' } }
    });
    
    if (existingEvent) {
      console.log(`Razorpay event ${eventId} already processed. Skipping.`);
      return;
    }

    // Mark as processing/processed
    await prisma.webhookEvent.create({
      data: { id: eventId, provider: 'RAZORPAY' }
    });
  } catch (err: any) {
    // If multiple concurrent requests try to create, one will hit a unique constraint error
    if (err.code === 'P2002') {
      console.log(`Razorpay event ${eventId} is being processed concurrently. Skipping.`);
      return;
    }
    throw err;
  }

  // Handle specific events
  if (event === 'payment_link.paid' || event === 'payment.captured') {
     const referenceId = payload.payload?.payment_link?.entity?.reference_id || payload.payload?.payment?.entity?.notes?.reference_id;
     
     if (referenceId) {
       const order = await prisma.order.findUnique({
         where: { id: referenceId },
         include: { customer: true }
       });

       if (order && order.status !== 'PAID') {
         // Mark order as PAID
         await prisma.order.update({
           where: { id: order.id },
           data: { status: 'PAID' }
         });

         // Complete Draft Order in Shopify
         if (order.shopifyDraftOrderId) {
           const completedOrder = await completeDraftOrder(order.shopifyDraftOrderId);
           
           if (completedOrder && completedOrder.order_id) {
             await prisma.order.update({
               where: { id: order.id },
               data: { shopifyOrderId: completedOrder.order_id.toString() }
             });
           }
         }

         // Notify customer
         await sendWhatsAppMessage(
           order.customer.phoneNumber,
           `Payment received successfully! Your order has been placed and is now confirmed.`
         );

         // Clear cart
         await clearCart(order.customer.phoneNumber);
       }
     }
  } else if (event === 'payment.failed') {
     const referenceId = payload.payload?.payment?.entity?.notes?.reference_id;
     if (referenceId) {
       const order = await prisma.order.findUnique({
         where: { id: referenceId },
         include: { customer: true }
       });

       if (order && order.status === 'PENDING') {
         await sendWhatsAppMessage(
           order.customer.phoneNumber,
           `We noticed your recent payment attempt failed. You can try paying again using the same link or reply "checkout" to start over.`
         );
       }
     }
  }
}

export default router;
