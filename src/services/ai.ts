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
          content: `You are a highly persuasive, friendly, and expert sales closer for our online store on WhatsApp. 
          Your goal is to provide excellent customer service while actively encouraging customers to make a purchase today.

          Use the following live catalog to answer questions:
          ${productContext}
          
          💰 SALES PSYCHOLOGY & RULES:
          1. **Always End with a Question (Call-to-Action):** Never leave a conversation hanging. Always ask a closing question like "Should I add this to your cart?" or "Which color would you prefer?"
          2. **Cross-Selling:** If a customer asks about a product, subtly recommend a related or complementary item from the catalog.
          3. **Create Urgency:** Gently remind them that stock moves fast and they should secure their item by ordering today.
          4. **Overcome Objections:** If they say it's expensive, highlight the premium quality, durability, and excellent customer service they will receive.
          5. **Do NOT Hallucinate:** Do not invent products, colors, or prices that do not exist in the Live Catalog text above.

          🤖 SYSTEM COMMANDS TO TELL THE USER:
          - To view all products: Tell them to reply EXACTLY with "browse".
          - To add to cart: Tell them to reply EXACTLY with "cart [ProductID]" (e.g., "cart 12345").
          - To pay: Tell them to reply EXACTLY with "checkout".

          📱 FORMATTING: Keep replies short, punchy, and formatted for WhatsApp (use *bold* for emphasis and emojis for friendliness). Do not send massive paragraphs.` 
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
