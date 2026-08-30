"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const twilio_1 = require("../services/twilio");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Helper to verify Shopify Webhook
const verifyShopifyWebhook = (body, signature) => {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
    const hash = crypto_1.default.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
    return hash === signature;
};
// Endpoint for receiving webhooks from Shopify
router.post('/', async (req, res) => {
    try {
        const topic = req.headers['x-shopify-topic'];
        const signature = req.headers['x-shopify-hmac-sha256'];
        const webhookId = req.headers['x-shopify-webhook-id'];
        // In production, use req.rawBody
        const bodyString = JSON.stringify(req.body);
        if (!verifyShopifyWebhook(bodyString, signature)) {
            console.error('Invalid Shopify Webhook Signature');
            if (process.env.SHOPIFY_WEBHOOK_SECRET) {
                res.status(401).send('Unauthorized');
                return;
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
    }
    catch (error) {
        console.error('Error handling Shopify webhook request:', error);
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
    }
});
async function processShopifyEvent(webhookId, topic, payload) {
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
    }
    catch (err) {
        if (err.code === 'P2002')
            return;
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
                await (0, twilio_1.sendTemplateMessage)(order.customer.phoneNumber, 'order_shipped', {
                    '1': trackingCompany,
                    '2': trackingNumber,
                    '3': trackingUrl
                });
            }
        }
    }
}
exports.default = router;
