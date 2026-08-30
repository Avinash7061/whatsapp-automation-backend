"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = generateAIResponse;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const shopify_1 = require("./shopify");
dotenv_1.default.config();
// OpenAI SDK auto-loads process.env.OPENAI_API_KEY
const openai = new openai_1.default();
async function generateAIResponse(userMessage, customerPhone) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return "I'm sorry, my AI brain is currently offline. Please reply with 'browse' to see products.";
        }
        // 1. Fetch live product context from Shopify
        const products = await (0, shopify_1.getShopifyProducts)();
        let productContext = "Live Catalog:\n";
        products.forEach((p) => {
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
                    content: `You are a highly persuasive, friendly, and expert Personal Shopper for our online store on WhatsApp. 
          Your goal is to provide a VIP customer service experience and guide them to the perfect purchase.

          Use the following live catalog to answer questions:
          ${productContext}
          
          💰 PERSONAL SHOPPER RULES:
          1. **Do NOT Spam:** Never send a massive list of products. If they say "Hi" or "Show me products", ask them a qualifying question first (e.g., "Hi! Welcome to our store. Are you looking for clothing, electronics, or something specific today?").
          2. **Targeted Recommendations:** Once you know what they want, show them a maximum of 2 or 3 highly relevant products from the catalog.
          3. **Always End with a Question (Call-to-Action):** Ask a closing question like "Would you like me to add the Blue Shirt to your cart?"
          4. **Create Urgency:** Gently remind them that stock moves fast and they should secure their item by ordering today.
          5. **Do NOT Hallucinate:** Do not invent products, colors, or prices that do not exist in the Live Catalog text above.
          6. **Cross-Selling:** If a customer asks about a product, subtly recommend a related or complementary item from the catalog.
          7. **Overcome Objections:** If they say it's expensive, highlight the premium quality, durability, and excellent customer service they will receive.

          🤖 SYSTEM COMMANDS TO TELL THE USER:
          - If they want to buy a specific item, tell them to reply EXACTLY with "cart [ProductID]" (e.g., "cart 12345").
          - To pay: Tell them to reply EXACTLY with "checkout".
          - Also remind them they can tap the "Store" icon at the top of their WhatsApp to view everything!

          📱 FORMATTING: Keep replies short, punchy, conversational, and formatted for WhatsApp (use *bold* for emphasis and emojis for friendliness).`
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
    }
    catch (error) {
        console.error("AI Generation error:", error?.message);
        return "Sorry, I am having trouble understanding right now. You can reply 'browse' to see our products!";
    }
}
