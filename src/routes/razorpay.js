"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Endpoint for receiving webhooks from Razorpay
router.post('/', async (req, res) => {
    try {
        const event = req.body?.event;
        console.log(`Received Razorpay Webhook [${event}]:`, req.body?.payload?.payment?.entity?.id);
        // TODO: Verify signature and handle payment events (e.g., payment.captured)
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error handling Razorpay webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});
exports.default = router;
//# sourceMappingURL=razorpay.js.map