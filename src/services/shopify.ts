import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || '';
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || '';

const shopifyStorefrontApi = axios.create({
  baseURL: `https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`,
  headers: {
    'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  },
});

export const getShopifyProducts = async (limit: number = 50) => {
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
    return response.data.data.products.edges.map((edge: any) => {
      const node = edge.node;
      const priceAmount = node.variants.edges[0]?.node?.price?.amount || 0;
      return {
        id: node.id,
        title: node.title,
        description: node.description,
        price: Number(priceAmount)
      };
    });
  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    throw error;
  }
};
