const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const User = require('../models/User');

// Create payment intent for class booking
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const { classId, amount } = req.body;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // amount in cents
      currency: 'usd',
      metadata: {
        classId,
        userId: req.user.id
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Handle successful payment
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      const { classId, userId } = paymentIntent.metadata;

      // Update booking payment status
      await Booking.findOneAndUpdate(
        { classId, userId },
        { 
          paymentStatus: 'paid',
          paymentId: paymentIntent.id
        }
      );

      // Update user's membership if it's a membership payment
      if (paymentIntent.metadata.isMembership) {
        await User.findByIdAndUpdate(userId, {
          'membership.status': 'active',
          'membership.startDate': new Date(),
          'membership.endDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      // Handle failed payment
      await Booking.findOneAndUpdate(
        { paymentId: failedPayment.id },
        { paymentStatus: 'failed' }
      );
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Get payment history
router.get('/history', auth, async (req, res) => {
  try {
    const payments = await stripe.paymentIntents.list({
      limit: 10,
      metadata: { userId: req.user.id }
    });

    res.json(payments.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create subscription
router.post('/subscription', auth, async (req, res) => {
  try {
    const { priceId } = req.body;

    // Create a customer if they don't exist
    const user = await User.findById(req.user.id);
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: req.user.id
        }
      });
      customerId = customer.id;
      await User.findByIdAndUpdate(req.user.id, { stripeCustomerId: customerId });
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 