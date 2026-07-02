const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const logger = require("../utils/logger");

// --- DASHBOARD STATS ---
exports.getDashboardStats = async (req, res, next) => {
  try {
    const match = req.user.role === "seller" ? { seller: req.user._id } : {};

    const totalProducts = await Product.countDocuments(match);
    const ordersMatch =
      req.user.role === "seller"
        ? {
            "orderItems.product": {
              $in: (await Product.find(match).select("_id")).map((p) => p._id),
            },
          }
        : {};

    const totalOrders = await Order.countDocuments(ordersMatch);
    const users = await User.countDocuments({ role: "customer" });

    // Sum total revenue (admin only)
    let revenue = 0;
    if (req.user.role === "admin") {
      const aggs = await Order.aggregate([
        { $match: { paymentInfo: { status: "Completed" } } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]);
      revenue = aggs.length > 0 ? aggs[0].total : 0;
    }

    res.status(200).json({
      success: true,
      stats: { totalProducts, totalOrders, users, revenue },
    });
  } catch (error) {
    next(error);
  }
};

// --- PRODUCTS ---
exports.getAllProducts = async (req, res, next) => {
  try {
    const query = req.user.role === "seller" ? { seller: req.user._id } : {};
    const products = await Product.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const productData = {
      ...req.body,
      price: Number(req.body.price),
      cuttedPrice: Number(req.body.cuttedPrice),
      stock: Number(req.body.stock),
    };
    if (req.user.role === "seller") productData.seller = req.user._id;
    const product = await Product.create(productData);
    res
      .status(201)
      .json({ success: true, message: "Product created", product });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res.status(404).json({ success: false, message: "Not found" });
    if (
      req.user.role === "seller" &&
      product.seller?.toString() !== req.user._id.toString()
    )
      return res.status(403).json({ success: false, message: "Unauthorized" });
    await product.deleteOne();
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    next(error);
  }
};

// --- ORDERS ---
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

exports.getSellerOrders = async (req, res, next) => {
  try {
    const myProducts = await Product.find({ seller: req.user._id }).select(
      "_id",
    );
    const myProductIds = myProducts.map((p) => p._id);
    const orders = await Order.find({
      "orderItems.product": { $in: myProductIds },
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.orderStatus = req.body.status;
    if (req.body.status === "Delivered") order.deliveredAt = new Date();
    if (req.body.status === "Cancelled") order.cancelledAt = new Date();

    await order.save();
    res.status(200).json({ success: true, message: "Status updated", order });
  } catch (error) {
    next(error);
  }
};

// --- USERS ---
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("-password -passwordHistory -mfaSecret -mfaBackupCodes")
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    user.role = req.body.role;
    if (req.body.role === "customer") user.isSuspended = false;
    await user.save();
    res.status(200).json({ success: true, message: "User updated" });
  } catch (error) {
    next(error);
  }
};
// Add at the bottom of adminController.js
exports.updateSellerRequest = async (req, res, next) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    const user = await User.findById(req.params.id);

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    user.sellerRequest = status;
    if (status === "approved") {
      user.role = "seller";
    }

    await user.save({ validateBeforeSave: false });
    res
      .status(200)
      .json({ success: true, message: `Seller request ${status}` });
  } catch (error) {
    next(error);
  }
};
