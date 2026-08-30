# Meta (Facebook) Setup Guide for WhatsApp E-Commerce

This guide walks you through every single step required on the **Meta (Facebook)** side to take your automated WhatsApp store live, enable the native product catalog, and connect with Twilio.

---

## 📋 Overview of Meta Requirements

To operate a live WhatsApp Business API store, Meta requires three core assets:
1. **Meta Business Account (Business Portfolio)** – The overarching business identity.
2. **WhatsApp Business Account (WABA)** – The WhatsApp entity holding your phone number and templates.
3. **Meta Commerce Manager & Catalog** – Houses your Shopify product catalog and powers the native "Shop" button in WhatsApp.

---

## Step 1: Create & Verify Your Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com/) and log in with your primary Facebook account.
2. Click **Create a Business Account** (Business Portfolio) and enter:
   - Business Name (e.g., `Sysvent`)
   - Your Name & Official Business Email (e.g., `support@sysvent.store`)
3. Open your email inbox and click the confirmation link sent by Meta.
4. **Business Verification (Recommended for higher message limits):**
   - Go to **Business Settings** (gear icon) → **Security Center**.
   - Under *Business Verification*, click **Start Verification**.
   - Upload official business documents (e.g., GST Certificate, Certificate of Incorporation, or Business PAN/Bank Statement).
   - Verify domain ownership by adding a DNS TXT record for `sysvent.store`.

---

## Step 2: Prepare Your Dedicated WhatsApp Phone Number

> [!IMPORTANT]
> **Phone Number Rule:** The phone number used for the WhatsApp Business API **CANNOT** be actively registered on the standard WhatsApp or WhatsApp Business mobile app.

- If the number is currently in use on a phone:
  1. Open WhatsApp on the phone → **Settings** → **Account**.
  2. Tap **Delete My Account** (make sure to back up any personal chats first if needed).
- Once deleted, the number is immediately eligible to receive the OTP verification via SMS/Voice during API onboarding.

---

## Step 3: Connect Shopify Products to Meta Catalog (Native Storefront)

This step creates the permanent "Store" icon inside your WhatsApp chat with native "Add to Cart" buttons.

### 3.1 Install the Facebook & Instagram App in Shopify
1. In your Shopify Admin, go to **Apps** → Search for **Facebook & Instagram** (by Meta).
2. Click **Install**.
3. Follow the setup wizard to connect your Facebook account and select your **Meta Business Portfolio**.
4. Select or create a **Meta Commerce Account** and choose **sysvent.store** as your target sales channel.
5. All your active Shopify products will automatically sync into a **Meta Product Catalog**.

### 3.2 Link the Catalog to WhatsApp
1. Go to [Meta Commerce Manager](https://business.facebook.com/commerce).
2. Select your catalog (synced from Shopify).
3. In the left sidebar, click **Settings** → **Catalog**.
4. Under **WhatsApp Business Account**, click **Connect** and link your WABA number.
5. Once linked, any customer opening your WhatsApp chat will see the native **Shop / Catalog** button at the top!

---

## Step 4: Link Meta WABA to Twilio

To route messages through Twilio to your Render server:

1. Open the [Twilio Console](https://console.twilio.com/).
2. Navigate to **Messaging** → **Senders** → **WhatsApp Senders**.
3. Click **Add New Sender** (or **Sign up with Meta**).
4. A Meta popup window will appear (**Meta Embedded Signup**):
   - Select your existing **Meta Business Portfolio**.
   - Select or create your **WhatsApp Business Account**.
   - Enter your WhatsApp Business Display Name (must closely match your business legal name or website branding, e.g., `Sysvent Store`).
   - Select your business category (e.g., *Shopping & Retail*).
   - Enter your dedicated phone number and verify it via SMS / Voice call OTP.
5. Once approved, Twilio will display your number with status **Approved** and provide your `TWILIO_PHONE_NUMBER` (e.g., `whatsapp:+91XXXXXXXXXX`).

---

## Step 5: WhatsApp Message Templates (Order Shipping Notifications)

Meta strictly categorizes WhatsApp messages into two windows:
- **Service Conversations (Customer-initiated):** Free-form messages within 24 hours of a customer texting you (browsing, asking questions, checking out).
- **Template Messages (Business-initiated):** Required when sending updates after 24 hours (such as when an order ships days later).

### Creating the Shipping Notification Template:
1. In the **Twilio Console**, go to **Messaging** → **Content Editor** (or in **Meta WhatsApp Manager** → **Message Templates**).
2. Click **Create Template**.
3. **Template Name:** `order_shipped`
4. **Category:** `Utility` (Lowest Meta fee category)
5. **Language:** `English` (or `en_US`)
6. **Body Text:**
   ```text
   Great news! Your order has shipped via {{1}}.
   Tracking Number: {{2}}
   You can track your package here: {{3}}
   ```
7. Click **Submit for Review**. Meta's automated AI review typically approves utility templates in 1–15 minutes.

---

## Step 6: Configure WhatsApp Profile Details

Give your WhatsApp bot a professional, trustworthy appearance:

1. Go to **Meta Business Suite** → **WhatsApp Manager** → **Phone Numbers** (or configure directly in Twilio Sender profile).
2. Click **Profile** and fill out:
   - **Profile Picture / Logo:** High-resolution square logo (500x500 px).
   - **Business Description:** Brief summary of what your store sells.
   - **Website:** `https://sysvent.store`
   - **Email:** `support@sysvent.store`
   - **Business Category:** `Retail and Shopping`

---

## 🚀 Summary Checklist

- [ ] Meta Business Portfolio created and email verified
- [ ] Business Verification submitted (optional for initial tier, recommended for scaling)
- [ ] Clean phone number prepared (unlinked from personal WhatsApp app)
- [ ] Shopify products synced to Meta Commerce Manager
- [ ] Catalog linked to WhatsApp Business Account
- [ ] Twilio WhatsApp Sender verified via Meta Embedded Signup
- [ ] `order_shipped` Utility Template submitted and approved
- [ ] Profile photo, description, and website URL configured
