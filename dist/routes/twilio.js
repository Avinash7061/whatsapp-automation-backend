"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const twilio_1 = require("../services/twilio");
const ai_1 = require("../services/ai");
const shopify_1 = require("../services/shopify");
const cart_1 = require("../services/cart");
const shopifyAdmin_1 = require("../services/shopifyAdmin");
const razorpay_1 = require("../services/razorpay");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Twilio webhooks are sent as URL-encoded forms (application/x-www-form-urlencoded)
router.post('/', async (req, res) => {
    try {
        const { Body, From } = req.body;
        if (!Body || !From) {
            res.status(400).send('Missing Body or From');
            return;
        }
        // Twilio 'From' looks like 'whatsapp:+919876543210'
        const customerPhone = From.replace('whatsapp:', '');
        const messageText = String(Body).trim();
        // Acknowledge the webhook immediately so Twilio doesn't retry
        res.status(200).send('OK');
        // Run the actual logic asynchronously
        processMessage(customerPhone, messageText).catch(err => {
            console.error('Error processing Twilio message:', err);
        });
    }
    catch (error) {
        console.error('Error parsing Twilio webhook:', error);
        if (!res.headersSent) {
            res.status(500).send('Server Error');
        }
    }
});
async function processMessage(phone, rawText) {
    const lowerText = rawText.toLowerCase().trim();
    try {
        // 1. Browse Command
        if (lowerText === 'browse') {
            const products = await (0, shopify_1.getShopifyProducts)();
            if (products.length === 0) {
                await (0, twilio_1.sendWhatsAppMessage)(phone, "Our store catalog is currently being updated. Please check back shortly!");
                return;
            }
            let responseText = "*Welcome to our Store!* 🛍️\n\nHere are our top products:\n";
            products.slice(0, 10).forEach(p => {
                const productId = p.id.split('/').pop();
                responseText += `\n*${p.title}* - Rs ${p.price}\nTo buy, reply: *cart ${productId}*\n`;
            });
            responseText += "\n_Tip: You can also tap the Store icon at the top of this chat to browse all products!_";
            await (0, twilio_1.sendWhatsAppMessage)(phone, responseText);
            return;
        }
        // 2. Cart Command
        if (lowerText.startsWith('cart ') || lowerText.startsWith('add to cart ')) {
            const parts = lowerText.replace('add to cart', 'cart').split(' ');
            const productId = parts[1]?.trim();
            if (!productId) {
                await (0, twilio_1.sendWhatsAppMessage)(phone, "Please specify a product ID. Example: *cart 12345*");
                return;
            }
            const products = await (0, shopify_1.getShopifyProducts)();
            const product = products.find(p => p.id.endsWith(productId) || p.id.includes(productId));
            if (!product) {
                await (0, twilio_1.sendWhatsAppMessage)(phone, "Sorry, I couldn't find that product ID. Reply *browse* to see our available items!");
                return;
            }
            await (0, cart_1.addToCart)(phone, product);
            await (0, twilio_1.sendWhatsAppMessage)(phone, `✅ Added *${product.title}* to your cart!\n\nReply *checkout* to complete your payment, or *browse* to add more items.`);
            return;
        }
        // 3. Checkout Command
        if (lowerText === 'checkout' || lowerText === 'pay' || lowerText === 'buy now') {
            const cart = await (0, cart_1.getCart)(phone);
            const items = cart.items || [];
            if (items.length === 0) {
                await (0, twilio_1.sendWhatsAppMessage)(phone, "Your cart is currently empty! Reply *browse* to discover our products.");
                return;
            }
            await (0, twilio_1.sendWhatsAppMessage)(phone, "⏳ Generating your secure payment link...");
            const totalAmount = cart.totalAmount || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            // Create Draft Order in Shopify
            const draftOrder = await (0, shopifyAdmin_1.createDraftOrder)(items, phone);
            const draftOrderId = draftOrder?.id ? String(draftOrder.id) : null;
            // Create a pending Order in DB
            const dbOrder = await prisma.order.create({
                data: {
                    customerId: cart.customerId,
                    shopifyDraftOrderId: draftOrderId,
                    amount: totalAmount,
                    status: 'PENDING'
                }
            });
            // Create Razorpay Link
            const paymentLink = await (0, razorpay_1.createPaymentLink)(totalAmount, dbOrder.id, phone);
            // Clear the cart session
            await (0, cart_1.clearCart)(phone);
            const checkoutUrl = paymentLink?.short_url || paymentLink?.url;
            await (0, twilio_1.sendWhatsAppMessage)(phone, `*Your order is ready!* 💳\n\n*Total Amount:* Rs ${totalAmount}\n\nTap the link below to pay securely via UPI, Card, or NetBanking:\n${checkoutUrl}`);
            return;
        }
        // 4. Default: AI Sales Assistant & Personal Shopper
        const aiResponse = await (0, ai_1.generateAIResponse)(rawText, phone);
        await (0, twilio_1.sendWhatsAppMessage)(phone, aiResponse);
    }
    catch (error) {
        console.error("Error in processMessage logic:", error?.message || error);
        await (0, twilio_1.sendWhatsAppMessage)(phone, "Sorry, I had a brief connection issue. Please try replying *browse* or *checkout*!");
    }
}
exports.default = router;
