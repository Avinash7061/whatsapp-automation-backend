"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Endpoint for receiving messages from Interakt
router.post('/', async (req, res) => {
    try {
        console.log('Received Interakt Webhook:', JSON.stringify(req.body, null, 2));
        // TODO: Implement Interakt message parsing and handling
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error handling Interakt webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});
exports.default = router;
//# sourceMappingURL=interakt.js.map