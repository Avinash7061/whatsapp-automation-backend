"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const interakt_1 = require("../services/interakt");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Helper to verify Shopify Webhook (in production use the raw body)
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
        // Note: For real signature verification, you need the raw body.
        const bodyString = JSON.stringify(req.body);
        if (!verifyShopifyWebhook(bodyString, signature)) {
            console.error('Invalid Shopify Webhook Signature');
            // We'll proceed anyway for testing if secret isn't set, but in prod you must return 401
            if (process.env.SHOPIFY_WEBHOOK_SECRET) {
                return res.status(401).send('Unauthorized');
            }
        }
        console.log(`Received Shopify Webhook [${topic}]:`, req.body?.id);
        if (topic === 'orders/fulfilled' || topic === 'fulfillments/create') {
            // Look up the order in our DB by Shopify Order ID
            // The payload for orders/fulfilled has the order ID at req.body.id
            // The payload for fulfillments/create has it at req.body.order_id
            const shopifyOrderId = req.body.order_id || req.body.id;
            if (shopifyOrderId) {
                const order = await prisma.order.findUnique({
                    where: { shopifyOrderId: shopifyOrderId.toString() },
                    include: { customer: true }
                });
                if (order) {
                    // Extract tracking info if available
                    const trackingCompany = req.body.tracking_company || 'the carrier';
                    const trackingNumber = req.body.tracking_number || req.body.tracking_numbers?.[0];
                    const trackingUrl = req.body.tracking_url || req.body.tracking_urls?.[0];
                    let message = `Great news! Your order is on the way.\\nShipped via ${trackingCompany}.`;
                    if (trackingNumber)
                        message += `\\nTracking Number: ${trackingNumber}`;
                    if (trackingUrl)
                        message += `\\nTrack your package: ${trackingUrl}`;
                    // Update status in DB
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { status: 'FULFILLED' }
                    });
                    // Send WhatsApp notification
                    await (0, interakt_1.sendTextMessage)(order.customer.phoneNumber, message);
                }
            }
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error handling Shopify webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});
exports.default = router;
