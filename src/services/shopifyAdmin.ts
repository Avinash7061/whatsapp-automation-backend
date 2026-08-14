import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '';

const shopifyAdminApi = axios.create({
  baseURL: `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01`,
  headers: {
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  },
});

export const createDraftOrder = async (cartItems: any[], customerPhoneNumber: string) => {
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
  } catch (error: any) {
    console.error('Error creating Shopify Draft Order:', error.response?.data || error.message);
    throw error;
  }
};

export const completeDraftOrder = async (draftOrderId: string) => {
  try {
    const response = await shopifyAdminApi.put(`/draft_orders/${draftOrderId}/complete.json`, {
        payment_pending: false
    });
    return response.data.draft_order;
  } catch (error: any) {
    console.error('Error completing Shopify Draft Order:', error.response?.data || error.message);
    throw error;
  }
};
