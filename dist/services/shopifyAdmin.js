"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeDraftOrder = exports.createDraftOrder = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';
const shopifyAdminApi = axios_1.default.create({
    baseURL: `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01`,
    headers: {
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
    },
});
const createDraftOrder = async (cartItems, customerPhoneNumber) => {
    try {
        const lineItems = cartItems.map(item => {
            // Handle potential GID format from Storefront API
            let variantId = item.variantId;
            if (typeof variantId === 'string' && variantId.includes('/')) {
                variantId = parseInt(variantId.split('/').pop() || '0');
            }
            return {
                variant_id: variantId,
                quantity: item.quantity,
            };
        });
        const response = await shopifyAdminApi.post('/draft_orders.json', {
            draft_order: {
                line_items: lineItems,
                customer: {
                    phone: customerPhoneNumber
                },
                use_customer_default_address: true,
            }
        });
        return response.data.draft_order;
    }
    catch (error) {
        console.error('Error creating Shopify Draft Order:', error.response?.data || error.message);
        throw error;
    }
};
exports.createDraftOrder = createDraftOrder;
const completeDraftOrder = async (draftOrderId) => {
    try {
        const response = await shopifyAdminApi.put(`/draft_orders/${draftOrderId}/complete.json`, {
            payment_pending: false
        });
        return response.data.draft_order;
    }
    catch (error) {
        console.error('Error completing Shopify Draft Order:', error.response?.data || error.message);
        throw error;
    }
};
exports.completeDraftOrder = completeDraftOrder;
