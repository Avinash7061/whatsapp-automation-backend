# WhatsApp Store: Architecture & Tech Stack Plan
### Shopify catalog + checkout · Razorpay payments · Order tracking, all inside WhatsApp

---

## 1. What you're building

A conversational storefront where a customer can, without leaving WhatsApp:
1. Browse your Shopify catalog
2. Add items to a cart
3. Pay via Razorpay (UPI/cards/netbanking/wallets)
4. Get order confirmation and live tracking updates

This is three platforms glued together by a backend you own. None of the three (Meta, Shopify, Razorpay) talks to the other two directly — your server is the middleman for all of it.

---

## 2. High-level architecture

```
                        ┌─────────────────────────┐
                        │   WhatsApp Business      │
                        │   Cloud API (via a BSP)  │
                        └───────────┬──────────────┘
                                    │ webhooks (in) / API calls (out)
                                    ▼
                        ┌─────────────────────────┐
                        │   YOUR BACKEND            │
                        │  (Node.js/Express or      │
                        │   Python/FastAPI)          │
                        │                            │
                        │  - Session/cart state      │
                        │  - Message router          │
                        │  - Order orchestration     │
                        └───┬──────────┬─────────┬──┘
                            │          │         │
              Storefront/   │          │         │  Webhooks:
              Admin API     │          │         │  order updates,
                            ▼          ▼         ▼  fulfillment
                     ┌─────────┐ ┌──────────┐ ┌──────────┐
                     │ Shopify │ │ Razorpay │ │ Database  │
                     │ (catalog,│ │(payment  │ │ (sessions,│
                     │ orders)  │ │ links/   │ │ carts,    │
                     │          │ │ orders)  │ │ mappings) │
                     └─────────┘ └──────────┘ └──────────┘
```

Your backend is the only component that talks to all three. It needs to be a persistent, publicly reachable server (not a client-side app) because WhatsApp, Shopify, and Razorpay all deliver events via webhooks.

---

## 3. The four pieces, in plain terms

### A. WhatsApp side — getting messages in and out
- Meta's **Cloud API** is the current standard (the old on-premise API is gone). It's per-message pricing since mid-2025, and messages inside a 24-hour customer-initiated window are cheap/free for utility content.
- You almost never talk to Meta directly. You go through a **BSP (Business Solution Provider)** — e.g. Twilio, Gupshup, Interakt, AiSensy, WATI — who handles number verification, template approval, and gives you a simpler REST API + webhook.
- **Decision needed:** build your own thin layer on a BSP's API (more control, more work), or use a Shopify-specific WhatsApp app from the Shopify App Store (faster, less flexible, often can't do custom Razorpay logic).
- For product browsing, Meta supports a native **WhatsApp Catalog** (up to 500 products, synced from Shopify via a product feed) with multi-product list messages. This gets you "browse in chat" without building a custom UI.

### B. Catalog & cart — Shopify Storefront/Admin API
- Product data comes from Shopify's **Storefront API** (GraphQL) — read-only, good for showing products/prices/variants in chat.
- Cart/checkout state: since there's no browser session here, your backend maintains **cart state per WhatsApp user** (keyed by phone number) in your own database, and only calls Shopify's **Admin API** to create a **Draft Order** once the customer is ready to check out.
- The draft order becomes the source of truth for what they're paying for.

### C. Payment — Razorpay
Two real options, worth deciding upfront:

| Option | How it works | Best for |
|---|---|---|
| **Razorpay Payment Links API** | Your backend creates a payment link tied to the draft order amount, sends it as a WhatsApp message, customer taps → opens Razorpay checkout in browser → webhook confirms payment | Fastest to build, works with any BSP |
| **Razorpay "Payments on WhatsApp"** | Razorpay is registered as a payment gateway directly inside Meta's WhatsApp Business Manager (native in-chat checkout, no browser redirect) | Better conversion, but requires your BSP/WABA to support Meta's Payments API and a bit more setup with both Meta and Razorpay |

Either way: **Razorpay webhooks** (`payment.captured`, `payment.failed`) are what actually confirm payment — never trust the client-side redirect alone. Always verify the webhook signature.

### D. Order tracking — Shopify → WhatsApp
- Once payment is confirmed, your backend marks the Shopify draft order as paid / converts it to a real order.
- Subscribe to Shopify **order and fulfillment webhooks** (`orders/paid`, `orders/fulfilled`, `fulfillments/update` with tracking info).
- On each event, your backend sends a WhatsApp template message to the customer ("Your order has shipped, tracking: ...").

---

## 4. Suggested tech stack

| Layer | Recommendation | Why |
|---|---|---|
| Backend | Node.js (Express/Fastify) or Python (FastAPI) | Both have solid Shopify and Razorpay SDKs; Node has slightly better WhatsApp/BSP SDK coverage |
| Database | PostgreSQL (or MongoDB if you prefer schema-less) | Store cart sessions, phone→customer mapping, order state |
| Hosting | Render, Railway, Fly.io, or AWS/GCP if you want more control | Needs to run 24/7 and expose public HTTPS webhook endpoints |
| Queue (optional, recommended once you scale) | Redis + BullMQ (Node) or Celery (Python) | Webhook processing should be async so Shopify/Razorpay/Meta don't time out waiting on you |
| WhatsApp BSP | Twilio, Gupshup, or Interakt (compare pricing/support) | Handles WABA, templates, message delivery |
| Payments | Razorpay Orders + Payment Links API (and later, Payments on WhatsApp) | |
| Shopify | Storefront API (catalog) + Admin API (draft orders, webhooks) | Requires a custom/private Shopify app with the right API scopes |

---

## 5. Build phases (recommended order)

1. **Foundation** — Stand up the backend, database, and webhook endpoints (empty handlers first, just to prove connectivity with all three services).
2. **WhatsApp inbound/outbound** — Get a test message flowing: user texts your number → BSP webhook hits your server → you reply. No Shopify/Razorpay yet.
3. **Catalog browsing** — Pull products from Shopify, send as WhatsApp list/catalog messages, let user "add to cart" (stored in your DB).
4. **Checkout + payment** — Convert cart → Shopify draft order → Razorpay payment link → webhook confirms → convert to real Shopify order.
5. **Order tracking** — Shopify fulfillment webhooks → WhatsApp status updates.
6. **Hardening** — Signature verification on all webhooks, retry/idempotency handling, session expiry, error messaging back to the user, logging/monitoring.

---

## 6. Things to verify/decide before writing code

- **BSP choice** — pricing, India support quality, and whether they support Razorpay's native "Payments on WhatsApp" if you want in-chat checkout later.
- **Catalog size and update frequency** — if your Shopify catalog changes often, decide between the native WhatsApp Catalog (auto-sync via feed) vs. querying Shopify live per conversation.
- **COD vs. prepaid only** — affects whether you always require Razorpay payment before order creation.
- **Data residency/compliance** — where your backend and database are hosted, especially if handling Indian payment/customer data.
- **Existing Shopify apps** — worth a quick check of the Shopify App Store for WhatsApp commerce apps before building from scratch; may cover 80% of this out of the box and you only build the Razorpay-specific bits.

---

## 7. What I can build with you next

Once you confirm the BSP and hosting choice, I can help write:
- The Express/FastAPI skeleton with the three webhook endpoints stubbed out
- The Shopify draft-order + Razorpay payment-link flow (this is the core piece)
- The order-tracking notification handler
