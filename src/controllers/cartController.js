const Cart = require("../models/Cart");
const Product = require("../models/Product");
const logger = require("../utils/logger");
const { validate } = require("../utils/validate");
const {
  addToCartSchema,
  updateCartItemSchema,
} = require("../validators/cartValidator");

exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate("items.product", "name price images stock cuttedPrice isActive")
      .lean();

    if (!cart) {
      cart = { user: req.user._id, items: [] };
    } else {
      // Filter out inactive/unavailable products
      cart.items = cart.items.filter(
        (item) => item.product && item.product.isActive,
      );
    }

    res.status(200).json({
      success: true,
      cart,
    });
  } catch (error) {
    next(error);
  }
};

exports.addToCart = [
  validate(addToCartSchema),

  async (req, res, next) => {
    try {
      const { productId, quantity = 1 } = req.body;

      // Verify product exists and is active
      const product = await Product.findById(productId);

      if (!product || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: "Product not found or unavailable",
        });
      }

      // Check stock
      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available`,
        });
      }

      let cart = await Cart.findOne({ user: req.user._id });

      if (!cart) {
        cart = await Cart.create({ user: req.user._id, items: [] });
      }

      // Check cart item limit
      if (cart.items.length >= 50) {
        return res.status(400).json({
          success: false,
          message: "Cart cannot have more than 50 different items",
        });
      }

      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId,
      );

      if (existingItem) {
        // Check if adding would exceed limit
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > 10) {
          return res.status(400).json({
            success: false,
            message: "Maximum 10 items per product",
          });
        }
        if (newQuantity > product.stock) {
          return res.status(400).json({
            success: false,
            message: `Only ${product.stock} items available`,
          });
        }
        existingItem.quantity = newQuantity;
      } else {
        cart.items.push({ product: productId, quantity });
      }

      await cart.save();

      const populatedCart = await Cart.findById(cart._id)
        .populate("items.product", "name price images stock cuttedPrice")
        .lean();

      res.status(200).json({
        success: true,
        message: "Item added to cart",
        cart: populatedCart,
      });
    } catch (error) {
      next(error);
    }
  },
];

exports.updateCartItem = [
  validate(updateCartItemSchema),

  async (req, res, next) => {
    try {
      const { productId, quantity } = req.body;

      const cart = await Cart.findOne({ user: req.user._id });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Cart not found",
        });
      }

      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId,
      );

      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Item not found in cart",
        });
      }

      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        cart.items.splice(itemIndex, 1);
      } else {
        // Verify stock
        const product = await Product.findById(productId);
        if (product && quantity > product.stock) {
          return res.status(400).json({
            success: false,
            message: `Only ${product.stock} items available`,
          });
        }

        cart.items[itemIndex].quantity = quantity;
      }

      await cart.save();

      const populatedCart = await Cart.findById(cart._id)
        .populate("items.product", "name price images stock cuttedPrice")
        .lean();

      res.status(200).json({
        success: true,
        message: "Cart updated",
        cart: populatedCart,
      });
    } catch (error) {
      next(error);
    }
  },
];

exports.removeCartItem = async (req, res, next) => {
  try {
    // Validate productId
    const { productId } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId,
    );

    if (cart.items.length === initialLength) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id)
      .populate("items.product", "name price images stock cuttedPrice")
      .lean();

    res.status(200).json({
      success: true,
      message: "Item removed from cart",
      cart: populatedCart,
    });
  } catch (error) {
    next(error);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const result = await Cart.findOneAndDelete({ user: req.user._id });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart cleared",
    });
  } catch (error) {
    next(error);
  }
};
