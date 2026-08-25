# Requirements & Launch Guide

This document outlines the business subscriptions required, exact steps to configure webhooks, and the final checklist to launch the WhatsApp E-Commerce Automation product to real customers.

---

## 1. Subscription & Account Requirements

To run this product in a live production environment, you need active accounts with the following providers:

### 🟢 Shopify
- **Subscription Required?** Yes. You need at least the **Basic Shopify Plan**.
- **Why?** The Shopify API (Admin and Storefront) is required to fetch products, create draft orders, and manage fulfillments. You cannot process live checkouts or use the API extensively on a paused or inactive store.

### 🟢 Interakt (WhatsApp BSP)
- **Subscription Required?** Yes. Interakt charges a monthly subscription (starting around ₹799/month depending on your region).
- **Additional Costs:** Meta (Facebook) charges per "Conversation" (a 24-hour window). You will pay for user-initiated conversations and business-initiated templates (like the shipping notification).
- **Prerequisites:** You must have a verified Facebook Business Manager account and a dedicated phone number that is not actively used on the normal WhatsApp consumer app.

### 🟢 Razorpay
- **Subscription Required?** No monthly fee. 
- **Costs:** Razorpay charges a standard transaction fee (typically around 2%) per successful payment.
- **Prerequisites:** To accept real money, you must complete Razorpay's KYC (Know Your Customer) process, submit business documents, and activate **Live Mode**. (You can use Test Mode for development).

### 🟢 Render (Hosting)
- **Subscription Required?** Highly Recommended for Production.
- **Why?** While you can use the free tier for testing, free web services on Render "go to sleep" after 15 minutes of inactivity. If a customer messages your WhatsApp while the server is asleep, they will experience a 30-50 second delay before getting a reply. Upgrading to a basic paid tier (approx. $7/month for Web + $7/month for DB) ensures instant 24/7 replies.

---

## 2. Webhook Setup Instructions

Webhooks are how external services tell your Render server that an event happened. 

**First, locate your Render URL:**
Go to your Render Dashboard, click your web service, and copy the URL (e.g., `https://whatsapp-store-backend.onrender.com`).

### Setting up Interakt Webhooks
*Purpose: Forwards incoming WhatsApp messages from customers to your code.*
1. Log in to the [Interakt Dashboard](https://app.interakt.ai/).
2. Navigate to **Settings** > **Developer Setting** (or API & Webhooks).
3. Find the **Webhook URL** field.
4. Enter: `https://[YOUR_RENDER_URL]/webhooks/interakt`
5. Save. Now, anytime someone texts your WhatsApp number, Interakt hits this URL.

### Setting up Shopify Webhooks
*Purpose: Tells your code when you have shipped an order so it can send a WhatsApp tracking message.*
1. Log in to your Shopify Admin Dashboard.
2. Click **Settings** (gear icon, bottom left) > **Notifications**.
3. Scroll all the way down to the **Webhooks** section.
4. Click **Create webhook**.
5. Set the Event to: **Fulfillment creation** (or `orders/fulfilled`).
6. Set the Format to: **JSON**.
7. Set the URL to: `https://[YOUR_RENDER_URL]/webhooks/shopify`
8. Set the Webhook API version to the latest.
9. Click **Save**.
*(Note: At the bottom of the Webhooks section in Shopify, there is a signing secret. Ensure this matches your `SHOPIFY_WEBHOOK_SECRET` in Render).*

### Setting up Razorpay Webhooks
*Purpose: Tells your code the exact moment a customer pays via the payment link.*
1. Log in to the Razorpay Dashboard.
2. Go to **Settings** > **Webhooks**.
3. Click **Add New Webhook**.
4. Set the Webhook URL to: `https://[YOUR_RENDER_URL]/webhooks/razorpay`
5. Enter a **Secret**. *(This can be any secure password you make up. You MUST copy this exact password and set it as `RAZORPAY_WEBHOOK_SECRET` in your Render Environment Variables).*
6. In the Active Events list, check:
   - `payment.captured`
   - `payment.failed`
   - `payment_link.paid`
7. Click **Create Webhook**.

---

## 3. Final Steps to Launch

Once your subscriptions and webhooks are configured, follow this final checklist to officially launch your automated store:

1. **Verify Environment Variables:** Double-check that your Render dashboard contains all the correct live API keys for Shopify, Razorpay, and Interakt, and your unique Webhook Secrets.
2. **Activate Razorpay Live Mode:** Switch your Razorpay dashboard from "Test Mode" to "Live Mode" and update the `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Render to the new live keys.
3. **Approve WhatsApp Templates:** Go to Interakt -> Templates. Create and submit a template named `order_shipped` (Language: English). It must contain 3 variables `{{1}}`, `{{2}}`, `{{3}}` for the Carrier, Tracking Number, and Tracking URL. Wait for Meta to approve it (usually takes a few minutes to hours).
4. **End-to-End Test:**
   - Use your personal phone to text "browse" to your WhatsApp Business number.
   - Add a product to your cart.
   - Text "checkout".
   - Click the Razorpay link and complete a real payment (you can use a ₹1 test product in Shopify).
   - Verify that your code replies with "Order Confirmed!" on WhatsApp.
   - Go to Shopify, mark that order as "Fulfilled", and add a tracking number.
   - Verify that you receive the `order_shipped` template message on WhatsApp.
5. **Go Live!** Add a "Click to WhatsApp" button on your Instagram, Facebook ads, and website to start driving traffic to your new automated conversational store!
