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

export interface ShopifyProductItem {
  id: string;
  variantId: string;
  title: string;
  description: string;
  price: number;
}

export const getShopifyProducts = async (limit: number = 50): Promise<ShopifyProductItem[]> => {
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
    return edges.map((edge: any) => {
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
  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    return [];
  }
};
