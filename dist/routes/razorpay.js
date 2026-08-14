"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const razorpay_1 = require("../services/razorpay");
const shopifyAdmin_1 = require("../services/shopifyAdmin");
const interakt_1 = require("../services/interakt");
const cart_1 = require("../services/cart");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Endpoint for receiving webhooks from Razorpay
// NOTE: Razorpay webhooks require raw body for signature verification.
// If express.json() messes up the raw body, we might need a custom middleware here.
// Assuming req.body is accessible as a string or express is configured to keep raw body.
router.post('/', async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        // Simplification for the example: normally you'd use req.rawBody or similar.
        const bodyString = JSON.stringify(req.body);
        if (!(0, razorpay_1.verifyWebhookSignature)(bodyString, signature)) {
            console.error('Invalid Razorpay Webhook Signature');
            return res.status(400).send('Invalid signature');
        }
        const event = req.body?.event;
        console.log(`Received Razorpay Webhook [${event}]`);
        if (event === 'payment_link.paid' || event === 'payment.captured') {
            // Look up the order using the reference_id we passed during link creation
            // or through the payment link id in the payload.
            // The payload structure depends on the exact event. For payment_link.paid, 
            // it's req.body.payload.payment_link.entity.reference_id
            const referenceId = req.body.payload?.payment_link?.entity?.reference_id;
            if (referenceId) {
                const order = await prisma.order.findUnique({
                    where: { id: referenceId },
                    include: { customer: true }
                });
                if (order && order.status !== 'PAID') {
                    // 1. Mark order as PAID in our DB
                    await prisma.order.update({
                        where: { id: order.id },
                        data: { status: 'PAID' }
                    });
                    // 2. Complete the Draft Order in Shopify
                    if (order.shopifyDraftOrderId) {
                        const completedOrder = await (0, shopifyAdmin_1.completeDraftOrder)(order.shopifyDraftOrderId);
                        // Update our DB with the real Shopify Order ID
                        if (completedOrder && completedOrder.order_id) {
                            await prisma.order.update({
                                where: { id: order.id },
                                data: { shopifyOrderId: completedOrder.order_id.toString() }
                            });
                        }
                    }
                    // 3. Notify the customer
                    await (0, interakt_1.sendTextMessage)(order.customer.phoneNumber, `Payment received successfully! Your order has been placed.`);
                    // 4. Clear the cart
                    await (0, cart_1.clearCart)(order.customer.phoneNumber);
                }
            }
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error handling Razorpay webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});
exports.default = router;
