import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendTemplateMessage } from '../services/interakt';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Helper to verify Shopify Webhook
const verifyShopifyWebhook = (body: string, signature: string) => {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
  return hash === signature;
};

// Endpoint for receiving webhooks from Shopify
router.post('/', async (req: Request, res: Response) => {
  try {
    const topic = req.headers['x-shopify-topic'] as string;
    const signature = req.headers['x-shopify-hmac-sha256'] as string;
    const webhookId = req.headers['x-shopify-webhook-id'] as string;
    
    // In production, use req.rawBody
    const bodyString = JSON.stringify(req.body);
    
    if (!verifyShopifyWebhook(bodyString, signature)) {
       console.error('Invalid Shopify Webhook Signature');
       if (process.env.SHOPIFY_WEBHOOK_SECRET) {
           return res.status(401).send('Unauthorized');
       }
    }

    console.log(`Received Shopify Webhook [${topic}] ID: ${webhookId}`);
    
    // Respond early
    res.status(200).send('OK');

    if (webhookId) {
        processShopifyEvent(webhookId, topic, req.body).catch(err => {
            console.error(`Error processing Shopify event ${webhookId}:`, err);
        });
    }

  } catch (error) {
    console.error('Error handling Shopify webhook request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

async function processShopifyEvent(webhookId: string, topic: string, payload: any) {
  // Idempotency check
  try {
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { id_provider: { id: webhookId, provider: 'SHOPIFY' } }
    });
    
    if (existingEvent) {
      console.log(`Shopify event ${webhookId} already processed. Skipping.`);
      return;
    }

    await prisma.webhookEvent.create({
      data: { id: webhookId, provider: 'SHOPIFY' }
    });
  } catch (err: any) {
    if (err.code === 'P2002') return;
    throw err;
  }

  if (topic === 'orders/fulfilled' || topic === 'fulfillments/create') {
      const shopifyOrderId = payload.order_id || payload.id;
      
      if (shopifyOrderId) {
          const order = await prisma.order.findUnique({
              where: { shopifyOrderId: shopifyOrderId.toString() },
              include: { customer: true }
          });

          if (order) {
              const trackingCompany = payload.tracking_company || 'the carrier';
              const trackingNumber = payload.tracking_number || payload.tracking_numbers?.[0] || 'N/A';
              const trackingUrl = payload.tracking_url || payload.tracking_urls?.[0] || 'N/A';

              await prisma.order.update({
                  where: { id: order.id },
                  data: { status: 'FULFILLED' }
              });

              // Send WhatsApp template notification (assumes a template named 'order_shipped')
              // Note: Template name and language code must match Interakt dashboard
              await sendTemplateMessage(
                  order.customer.phoneNumber,
                  'order_shipped',
                  'en',
                  [trackingCompany, trackingNumber, trackingUrl]
              );
          }
      }
  }
}

export default router;
