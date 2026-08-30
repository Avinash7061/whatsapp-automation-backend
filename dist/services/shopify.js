"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShopifyProducts = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';
const shopifyStorefrontApi = axios_1.default.create({
    baseURL: `https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`,
    headers: {
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
        'Content-Type': 'application/json',
    },
});
const getShopifyProducts = async (limit = 50) => {
    const query = `
    {
      products(first: ${limit}) {
        edges {
          node {
            id
            title
            description
            variants(first: 1) {
              edges {
                node {
                  id
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
    try {
        const response = await shopifyStorefrontApi.post('', { query });
        const edges = response.data?.data?.products?.edges || [];
        return edges.map((edge) => {
            const node = edge.node;
            const variantNode = node.variants?.edges?.[0]?.node;
            const priceAmount = variantNode?.price?.amount || 0;
            return {
                id: node.id,
                variantId: variantNode?.id || '',
                title: node.title,
                description: node.description || '',
                price: Number(priceAmount)
            };
        });
    }
    catch (error) {
        console.error('Error fetching Shopify products:', error);
        return [];
    }
};
exports.getShopifyProducts = getShopifyProducts;
