# Migration Plan: Interakt ➡️ Twilio + OpenAI

This document outlines the architectural changes and manual setup steps required to transition the WhatsApp E-Commerce store from a paid Interakt subscription to a fully automated, pay-as-you-go **Twilio + OpenAI** architecture.

## 🎯 What is Changing?
We are replacing the "dumb" Interakt messaging system with an intelligent Twilio + OpenAI setup. 
1. **Cost Savings**: Eliminates the $296/year Interakt platform fee.
2. **AI Customer Support**: The bot will no longer just respond to "browse" or "checkout". If a customer asks a question about a product, OpenAI will read your Shopify catalog and answer them conversationally.

---

## 💻 Technical Code Changes (To be done by AI)

### 1. Package Updates
- **Remove**: `axios` (used for manual Interakt API calls, no longer strictly needed if using Twilio SDK).
- **Install**: `twilio` (Official Twilio Node.js SDK).
- **Install**: `openai` (Official OpenAI SDK).

### 2. Service Refactoring
- **Delete**: `src/services/interakt.ts`
- **Create**: `src/services/twilio.ts`
  - Implement `sendWhatsAppMessage()` using the Twilio client.
  - Implement `sendTemplateMessage()` using Twilio's Content API.
- **Create**: `src/services/ai.ts`
  - Implement `generateAIResponse()` which passes the user's message and current Shopify product context to GPT-4o-mini.

### 3. Route Refactoring
- **Rename & Update**: `src/routes/interakt.ts` ➡️ `src/routes/twilio.ts`
  - Parse Twilio's incoming webhook format (which uses URL-encoded forms, not JSON like Interakt).
  - Update the logic flow: If the user types "browse", "cart", or "checkout", use the standard automated flows. For *anything else*, pass the text to the `ai.ts` service for a conversational reply.
- **Update**: `src/index.ts` to mount `/webhooks/twilio` instead of interakt.
- **Update**: `src/routes/shopify.ts` to use Twilio's template sender for fulfillment notifications.

---

## 🛠️ Manual Tasks (To be done by YOU)

Before the new code can work, you must complete these setup steps in your browser:

### Step 1: Create a Twilio Account
1. Go to [Twilio.com](https://www.twilio.com/) and create a free account.
2. Navigate to the **Twilio Console Dashboard**.
3. Copy your **Account SID** and **Auth Token**.
4. Set up the **WhatsApp Sandbox** (or link a live Meta Business number). Copy the Twilio WhatsApp Phone Number.

### Step 2: Create an OpenAI Account
1. Go to [platform.openai.com](https://platform.openai.com/).
2. Add a payment method (put $5 in credits to start).
3. Go to **API Keys** and generate a new secret key. Copy this key.

### Step 3: Update Render Environment Variables
Go to your Render Dashboard -> Web Service -> Environment, and add/update the following:
- `TWILIO_ACCOUNT_SID` = (from Step 1)
- `TWILIO_AUTH_TOKEN` = (from Step 1)
- `TWILIO_PHONE_NUMBER` = (e.g., `whatsapp:+14155238886`)
- `OPENAI_API_KEY` = (from Step 2)
*(You can delete the old `INTERAKT_API_KEY` as it is no longer needed).*

### Step 4: Configure the Twilio Webhook
1. In Twilio, go to **Messaging** > **Senders** > **WhatsApp Senders** (or the Sandbox settings).
2. Under "When a message comes in", enter your webhook URL:
   `https://[YOUR_RENDER_URL]/webhooks/twilio`
3. Ensure the HTTP method is set to **POST**. Save.

### Step 5: Approve WhatsApp Templates in Twilio
Twilio handles templates slightly differently than Interakt.
1. Go to Twilio **Messaging** > **Content Editor**.
2. Create a new Content Template named `order_shipped`.
3. Add the 3 variables for Carrier, Tracking Number, and Tracking URL.
4. Submit it for WhatsApp approval.
