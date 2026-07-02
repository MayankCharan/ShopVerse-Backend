const mongoose = require("mongoose");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const logger = require("../utils/logger");
const { validate } = require("../utils/validate");
const Joi = require("joi");

const createOrderSchema = Joi.object({
  shippingInfo: Joi.object({
    address: Joi.string().trim().max(200).required(),
    city: Joi.string().trim().max(100).required(),
    state: Joi.string().trim().max(100).required(),
    country: Joi.string().trim().max(100).required(),
    pinCode: Joi.string()
      .pattern(/^\d{5,6}$/)
      .required(),
    phoneNo: Joi.string()
      .pattern(/^\+?[\d\s-]{10,15}$/)
      .required(),
  }).required(),
  paymentInfo: Joi.object({
    id: Joi.string().trim().required(),
    status: Joi.string().valid("Completed", "Cash on Delivery").required(),
  }).required(),
});

exports.createOrder = [
  validate(createOrderSchema),

  async (req, res, next) => {
    const mongooseSession = await mongoose.startSession();

    try {
      const { shippingInfo, paymentInfo } = req.body;

      const cart = await Cart.findOne({ user: req.user._id }).populate(
        "items.product",
      );

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Cart is empty",
        });
      }

      // SECURITY: Calculate prices from DATABASE
      let itemsPrice = 0;
      const orderItems = [];

      for (const item of cart.items) {
        if (!item.product) {
          return res.status(400).json({
            success: false,
            message: "One or more products no longer exist",
          });
        }

        if (item.product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${item.product.name}"`,
          });
        }

        const unitPrice = item.product.price; // DATABASE price
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

      let order;

      await mongooseSession.withTransaction(async () => {
        order = await Order.create(
          [
            {
              user: req.user._id,
              shippingInfo,
              orderItems,
              paymentInfo,
              itemsPrice,
              shippingPrice,
              totalPrice,
              paidAt: new Date(),
            },
          ],
          { session: mongooseSession },
        );

        // Deduct stock atomically
        for (const item of cart.items) {
          if (item.product) {
            const result = await Product.findByIdAndUpdate(
              item.product._id,
              { $inc: { stock: -item.quantity } },
              { session: mongooseSession, new: true },
            );

            if (result.stock < 0) {
              throw new Error(`Insufficient stock for "${result.name}"`);
            }
          }
        }

        // Clear cart
        await Cart.findOneAndDelete(
          { user: req.user._id },
          { session: mongooseSession },
        );
      });

      mongooseSession.endSession();

      logger.info("Order created", {
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
      mongooseSession.endSession();
      logger.error("Order creation failed", {
        error: error.message,
        userId: req.user._id,
        requestId: req.requestId,
      });
      next(error);
    }
  },
];

exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .select("-shippingInfo.phoneNo") // Don't expose phone in list
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderDetails = async (req, res, next) => {
  try {
    // Validate ObjectId
    const { id } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    const order = await Order.findById(id)
      .populate("user", "name email")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // IDOR protection: Ensure user owns this order
    if (order.user._id.toString() !== req.user._id.toString()) {
      logger.warn("Order access attempt by non-owner", {
        orderId: id,
        requestUserId: req.user._id,
        orderUserId: order.user._id,
        ip: req.ip,
        requestId: req.requestId,
      });
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
};
