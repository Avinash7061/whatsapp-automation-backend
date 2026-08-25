import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import twilioRoutes from './routes/twilio';
import shopifyRoutes from './routes/shopify';
import razorpayRoutes from './routes/razorpay';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Routes
app.use('/webhooks/twilio', twilioRoutes);
app.use('/webhooks/shopify', shopifyRoutes);
app.use('/webhooks/razorpay', razorpayRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
