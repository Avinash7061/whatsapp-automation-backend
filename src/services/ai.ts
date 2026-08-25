import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getShopifyProducts } from './shopify';

dotenv.config();

// OpenAI SDK auto-loads process.env.OPENAI_API_KEY
const openai = new OpenAI();

export async function generateAIResponse(userMessage: string, customerPhone: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return "I'm sorry, my AI brain is currently offline. Please reply with 'browse' to see products.";
    }

    // 1. Fetch live product context from Shopify
    const products = await getShopifyProducts();
    let productContext = "Live Catalog:\n";
    products.forEach(p => {
      // Extract the ID number from the Shopify Global ID (e.g. gid://shopify/Product/12345)
      const productId = p.id.split('/').pop();
      productContext += `- ${p.title} (ID: ${productId}) - Rs ${p.price}\n`;
    });

    // 2. Generate AI response using GPT-4o-mini
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `You are a helpful, friendly sales assistant for an online store on WhatsApp. 
          Use the following live catalog to answer questions:
          ${productContext}
          
          Important Instructions:
          - If they want to see all products, tell them to reply exactly with the word "browse".
          - If they want to buy something, tell them to reply "cart [ProductID]" (e.g. "cart 12345").
          - If they want to checkout, tell them to reply "checkout".
          - Keep your answers very short, concise, and formatted for WhatsApp (use *bold* and emojis).
          - Do not make up products or prices that are not in the Live Catalog.` 
        },
        { 
          role: 'user', 
          content: userMessage 
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || "I'm having trouble connecting to my brain right now!";
  } catch (error: any) {
    console.error("AI Generation error:", error?.message);
    return "Sorry, I am having trouble understanding right now. You can reply 'browse' to see our products!";
  }
}
