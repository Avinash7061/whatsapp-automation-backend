"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Endpoint for receiving webhooks from Shopify
router.post('/', async (req, res) => {
    try {
        const topic = req.headers['x-shopify-topic'];
        console.log(`Received Shopify Webhook [${topic}]:`, req.body?.id);
        // TODO: Verify signature and handle Shopify events (e.g., orders/fulfilled)
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error handling Shopify webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});
exports.default = router;
//# sourceMappingURL=shopify.js.map