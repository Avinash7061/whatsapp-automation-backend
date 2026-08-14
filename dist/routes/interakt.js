"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const interakt_1 = require("../services/interakt");
const shopify_1 = require("../services/shopify");
const cart_1 = require("../services/cart");
const shopifyAdmin_1 = require("../services/shopifyAdmin");
const razorpay_1 = require("../services/razorpay");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Endpoint for receiving messages from Interakt
router.post('/', async (req, res) => {
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
                    const products = await (0, shopify_1.getProducts)(3);
                    const productList = products.map((p) => `- ${p.title} (${p.variants.edges[0].node.price.currencyCode} ${p.variants.edges[0].node.price.amount})`).join('\\n');
                    await (0, interakt_1.sendTextMessage)(phoneNumber, `Here are our products:\\n${productList}\\n\\n(Reply with "add [Product Name]" to add to cart)`);
                }
                else if (text === 'cart') {
                    // View cart
                    const cart = await (0, cart_1.getOrCreateCart)(phoneNumber);
                    if (!cart || !cart.items || cart.items.length === 0) {
                        await (0, interakt_1.sendTextMessage)(phoneNumber, 'Your cart is empty.');
                    }
                    else {
                        const itemsList = cart.items.map((i) => `${i.quantity}x ${i.title} - ${i.price}`).join('\\n');
                        await (0, interakt_1.sendTextMessage)(phoneNumber, `Your Cart:\\n${itemsList}\\n\\nTotal: ${cart.totalAmount}\\n\\nReply "checkout" to pay.`);
                    }
                }
                else if (text === 'checkout') {
                    // Checkout Flow
                    const cart = await (0, cart_1.getOrCreateCart)(phoneNumber);
                    if (!cart || !cart.items || cart.items.length === 0) {
                        await (0, interakt_1.sendTextMessage)(phoneNumber, 'Your cart is empty. Nothing to checkout.');
                    }
                    else {
                        await (0, interakt_1.sendTextMessage)(phoneNumber, 'Generating your payment link, please wait...');
                        // 1. Create Shopify Draft Order
                        const draftOrder = await (0, shopifyAdmin_1.createDraftOrder)(cart.items, phoneNumber);
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
                        const paymentLink = await (0, razorpay_1.createPaymentLink)(cart.totalAmount, order.id, phoneNumber);
                        // 4. Update Order with Payment Link ID
                        await prisma.order.update({
                            where: { id: order.id },
                            data: { razorpayPaymentLinkId: paymentLink.id }
                        });
                        // 5. Send Link to user
                        await (0, interakt_1.sendTextMessage)(phoneNumber, `Your order is ready!\\nTotal: ₹${cart.totalAmount}\\n\\nPay here to complete your order:\\n${paymentLink.short_url}`);
                    }
                }
                else {
                    // Default Echo/Help
                    await (0, interakt_1.sendTextMessage)(phoneNumber, `Welcome to the Store!\\nReply "browse" to see products.\\nReply "cart" to view your cart.`);
                }
            }
        }
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error handling Interakt webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});
exports.default = router;
