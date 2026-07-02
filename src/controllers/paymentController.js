const mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { validate } = require("../utils/validate");
const {
  createCheckoutSessionSchema,
  createOrderAfterPaymentSchema,
} = require("../validators/paymentValidator");
const logger = require("../utils/logger");
const crypto = require("crypto");

/**
 * Create Stripe checkout session
 * CRITICAL: Prices are fetched from database, NOT from client
 */
exports.createCheckoutSession = [
  validate(createCheckoutSessionSchema),

  async (req, res, next) => {
    try {
      const { shippingInfo } = req.body;

      // Get user's cart with products
      const cart = await Cart.findOne({ user: req.user._id }).populate(
        "items.product",
      );

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
      }

      // SECURITY: Verify stock and get prices from DATABASE, not client
      let itemsPrice = 0;
      const lineItems = [];
      const orderItemsData = [];

      for (const item of cart.items) {
        if (!item.product || !item.product.isActive) {
          return res.status(400).json({
            success: false,
            message: `Product "${item.product?.name || "Unknown"}" is no longer available`,
          });
        }

        if (item.product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}`,
          });
        }

        // Use DATABASE price, NOT client price
        const unitPrice = item.product.price;
        itemsPrice += unitPrice * item.quantity;

        lineItems.push({
          price_data: {
            currency: "inr",
            product_data: {
              name: item.product.name.substring(0, 100), // Stripe limit
              images:
                item.product.images.length > 0
                  ? [item.product.images[0].url]
                  : [],
            },
            unit_amount: Math.round(unitPrice * 100), // Stripe requires cents
          },
          quantity: item.quantity,
        });

        // Store order item data for later
        orderItemsData.push({
          product: item.product._id,
          name: item.product.name,
          price: unitPrice, // DATABASE price
          quantity: item.quantity,
          image: item.product.images[0]?.url || "",
        });
      }

      // Calculate shipping (business logic)
      const shippingPrice = itemsPrice >= 500 ? 0 : 50;
      const totalPrice = itemsPrice + shippingPrice;

      // Generate idempotency key
      const idempotencyKey = `checkout_${req.user._id}_${Date.now()}`;

      // Create checkout session
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card", "upi"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/checkout?cancelled=true`,
        // SECURITY: Store minimal metadata, verify prices server-side
        metadata: {
          userId: req.user._id.toString(),
          cartId: cart._id.toString(),
          idempotencyKey,
          shippingInfo: JSON.stringify(shippingInfo), // Store shipping info for webhook
          expectedTotal: totalPrice.toString(), // For verification
        },
        // Set expiration
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
      });

      logger.info("Checkout session created", {
        userId: req.user._id,
        sessionId: checkoutSession.id,
        amount: totalPrice,
        requestId: req.requestId,
      });

      res.status(200).json({
        success: true,
        url: checkoutSession.url,
        sessionId: checkoutSession.id,
      });
    } catch (error) {
      logger.error("Checkout session creation failed", {
        error: error.message,
        userId: req.user._id,
        requestId: req.requestId,
      });
      next(error);
    }
  },
];

/**
 * Handle Stripe webhook
 * CRITICAL: This is the ONLY reliable way to confirm payment
 */
exports.handleStripeWebhook = async (req, res, next) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.rawBody || req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.error("Webhook signature verification failed", {
      error: err.message,
      ip: req.ip,
      requestId: req.requestId,
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await handleSuccessfulPayment(session);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        logger.warn("Payment failed", {
          paymentIntentId: paymentIntent.id,
          userId: paymentIntent.metadata?.userId,
          requestId: req.requestId,
        });
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object;
        logger.error("Payment dispute created", {
          disputeId: dispute.id,
          chargeId: dispute.charge,
          amount: dispute.amount,
          requestId: req.requestId,
        });
        break;
      }

      default:
        logger.info("Unhandled webhook event", { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error("Webhook handling failed", {
      event: event.type,
      error: error.message,
      requestId: req.requestId,
    });
    res.status(500).json({ error: "Webhook handler failed" });
  }
};

/**
 * Process successful payment (from webhook)
 */
async function handleSuccessfulPayment(stripeSession) {
  const { userId, cartId, idempotencyKey, expectedTotal } =
    stripeSession.metadata;

  // Check for idempotency (prevent duplicate orders)
  const existingOrder = await Order.findOne({ idempotencyKey });
  if (existingOrder) {
    logger.warn("Duplicate order attempt blocked", {
      idempotencyKey,
      orderId: existingOrder._id,
    });
    return;
  }

  // Get cart
  const cart = await Cart.findOne({ _id: cartId, user: userId }).populate(
    "items.product",
  );

  if (!cart || cart.items.length === 0) {
    logger.error("Cart not found for completed payment", {
      cartId,
      userId,
      sessionId: stripeSession.id,
    });
    return;
  }

  // SECURITY: Recalculate prices from DATABASE
  let itemsPrice = 0;
  const orderItems = [];
  const stockUpdates = [];

  for (const item of cart.items) {
    if (!item.product) continue;

    const unitPrice = item.product.price; // DATABASE price
    itemsPrice += unitPrice * item.quantity;

    orderItems.push({
      product: item.product._id,
      name: item.product.name,
      price: unitPrice,
      quantity: item.quantity,
      image: item.product.images[0]?.url || "",
    });

    stockUpdates.push({
      productId: item.product._id,
      quantity: item.quantity,
    });
  }

  const shippingPrice = itemsPrice >= 500 ? 0 : 50;
  const calculatedTotal = itemsPrice + shippingPrice;

  // SECURITY: Verify total matches (within small tolerance for currency rounding)
  const paidAmount = stripeSession.amount_total / 100;
  if (Math.abs(paidAmount - calculatedTotal) > 1) {
    logger.error("Price mismatch detected!", {
      expected: calculatedTotal,
      paid: paidAmount,
      sessionId: stripeSession.id,
      userId,
    });
    // Still create order but flag for review
  }

  // Parse shipping info from metadata
  let parsedShippingInfo = {};
  try {
    parsedShippingInfo = JSON.parse(
      stripeSession.metadata.shippingInfo || "{}",
    );
  } catch (e) {
    logger.error("Failed to parse shipping info from metadata", {
      sessionId: stripeSession.id,
    });
  }

  // Create order in a transaction
  const dbSession = await mongoose.startSession();
  let order;

  try {
    await dbSession.withTransaction(async () => {
      order = await Order.create(
        [
          {
            user: userId,
            shippingInfo: parsedShippingInfo,
            orderItems,
            paymentInfo: {
              id: stripeSession.id,
              status: "Completed",
            },
            itemsPrice,
            shippingPrice,
            totalPrice: paidAmount,
            paidAt: new Date(),
            orderStatus: "Processing",
            idempotencyKey,
          },
        ],
        { session: dbSession },
      );

      // Deduct stock
      for (const update of stockUpdates) {
        await Product.findByIdAndUpdate(
          update.productId,
          { $inc: { stock: -update.quantity } },
          { session: dbSession },
        );
      }

      // Clear cart
      await Cart.findOneAndDelete({ _id: cartId }, { session: dbSession });
    });
  } finally {
    dbSession.endSession();
  }

  logger.info("Order created from webhook", {
    orderId: order[0]._id,
    userId,
    amount: paidAmount,
    sessionId: stripeSession.id,
  });
}

/**
 * Create order after payment (fallback for client-side flow)
 * NOTE: Webhook is preferred. This is a backup.
 */
exports.createOrderAfterPayment = [
  validate(createOrderAfterPaymentSchema),

  async (req, res, next) => {
    try {
      const { session_id } = req.body;

      // Retrieve session from Stripe
      const stripeSession = await stripe.checkout.sessions.retrieve(session_id);

      if (stripeSession.payment_status !== "paid") {
        return res.status(400).json({
          success: false,
          message: "Payment not completed",
        });
      }

      // SECURITY: Verify user matches
      if (stripeSession.metadata.userId !== req.user._id.toString()) {
        logger.error("User mismatch in payment verification", {
          sessionUserId: stripeSession.metadata.userId,
          requestUserId: req.user._id,
          sessionId: session_id,
          ip: req.ip,
          requestId: req.requestId,
        });
        return res.status(403).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // Check for existing order (idempotency)
      const existingOrder = await Order.findOne({
        "paymentInfo.id": session_id,
      });

      if (existingOrder) {
        return res.status(200).json({
          success: true,
          order: existingOrder,
          message: "Order already exists",
        });
      }

      // Get cart
      const cart = await Cart.findOne({ user: req.user._id }).populate(
        "items.product",
      );

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty or already cleared",
        });
      }

      // SECURITY: Calculate prices from DATABASE
      let itemsPrice = 0;
      const orderItems = [];

      for (const item of cart.items) {
        if (!item.product) continue;

        const unitPrice = item.product.price;
        itemsPrice += unitPrice * item.quantity;

        orderItems.push({
          product: item.product._id,
          name: item.product.name,
          price: unitPrice,
          quantity: item.quantity,
          image: item.product.images[0]?.url || "",
        });
      }

      const shippingPrice = itemsPrice >= 500 ? 0 : 50;
      const totalPrice = itemsPrice + shippingPrice;

      // Parse shipping info from metadata
      let parsedShippingInfo = {};
      try {
        parsedShippingInfo = JSON.parse(
          stripeSession.metadata.shippingInfo || "{}",
        );
      } catch (e) {
        logger.error("Failed to parse shipping info from metadata", {
          sessionId: session_id,
        });
      }

      // Create order with transaction
      const dbSession = await mongoose.startSession();
      let order;

      try {
        await dbSession.withTransaction(async () => {
          order = await Order.create(
            [
              {
                user: req.user._id,
                shippingInfo: parsedShippingInfo,
                orderItems,
                paymentInfo: {
                  id: stripeSession.id,
                  status: "Completed",
                },
                itemsPrice,
                shippingPrice,
                totalPrice,
                paidAt: new Date(),
                orderStatus: "Processing",
                idempotencyKey: stripeSession.metadata.idempotencyKey,
              },
            ],
            { session: dbSession },
          );

          // Deduct stock
          for (const item of cart.items) {
            if (item.product) {
              await Product.findByIdAndUpdate(
                item.product._id,
                { $inc: { stock: -item.quantity } },
                { session: dbSession },
              );
            }
          }

          // Clear cart
          await Cart.findOneAndDelete(
            { user: req.user._id },
            { session: dbSession },
          );
        });
      } finally {
        dbSession.endSession();
      }

      logger.info("Order created (client flow)", {
        orderId: order[0]._id,
        userId: req.user._id,
        amount: totalPrice,
        requestId: req.requestId,
      });

      res.status(201).json({
        success: true,
        order: order[0],
      });
    } catch (error) {
      logger.error("Order creation failed", {
        error: error.message,
        userId: req.user._id,
        requestId: req.requestId,
      });
      next(error);
    }
  },
];
