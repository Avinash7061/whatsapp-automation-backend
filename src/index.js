"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const interakt_1 = __importDefault(require("./routes/interakt"));
const shopify_1 = __importDefault(require("./routes/shopify"));
const razorpay_1 = __importDefault(require("./routes/razorpay"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
// Note: Webhooks from Shopify and Razorpay often require raw body for signature verification.
// We may need to use express.raw({ type: 'application/json' }) for those specific routes later.
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Routes
app.use('/webhooks/interakt', interakt_1.default);
app.use('/webhooks/shopify', shopify_1.default);
app.use('/webhooks/razorpay', razorpay_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map