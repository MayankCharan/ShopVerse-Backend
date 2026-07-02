const Product = require("../models/Product");
const { validateQuery, validate } = require("../utils/validate");
const {
  getProductsSchema,
  createReviewSchema,
} = require("../validators/productValidator");
const { escapeRegex } = require("../utils/sanitize");
const logger = require("../utils/logger");

exports.getAllProducts = async (req, res, next) => {
  try {
    // Validate query parameters
    const {
      keyword,
      category,
      page = 1,
      limit = 8,
      sort,
    } = await getProductsSchema.validateAsync(req.query, {
      stripUnknown: true,
    });

    const query = {};

    // Security: Escape regex special characters to prevent ReDoS
    if (keyword) {
      const escapedKeyword = escapeRegex(keyword);
      query.name = { $regex: escapedKeyword, $options: "i" };
    }

    if (category && category !== "All") {
      query.category = category.toLowerCase().trim();
    }

    // Only show active products
    query.isActive = { $ne: false };

    let sortOption = { createdAt: -1 };
    if (sort === "priceLow") sortOption = { price: 1 };
    if (sort === "priceHigh") sortOption = { price: -1 };
    if (sort === "rating") sortOption = { ratings: -1 };

    // Cap limit to prevent excessive queries
    const safeLimit = Math.min(Number(limit), 50);
    const safePage = Math.max(Number(page), 1);

    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
      .select("-reviews") // Don't send reviews in list view
      .sort(sortOption)
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(); // Use lean for better performance

    res.status(200).json({
      success: true,
      products,
      totalProducts: count,
      totalPages: Math.ceil(count / safeLimit),
      currentPage: safePage,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductDetails = async (req, res, next) => {
  try {
    // Validate ObjectId format
    const { id } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Product.distinct("category", {
      isActive: { $ne: false },
    });
    res.status(200).json({
      success: true,
      categories: categories.sort(),
    });
  } catch (error) {
    next(error);
  }
};

exports.createReview = [
  // Validate input
  validate(createReviewSchema),

  async (req, res, next) => {
    try {
      const { rating, comment } = req.body;

      // Validate product ID
      const { id } = req.params;
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID format",
        });
      }

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // Check if product was purchased by user (optional: enforce this)
      // const hasPurchased = await Order.exists({
      //   user: req.user._id,
      //   "orderItems.product": id,
      //   orderStatus: { $ne: "Cancelled" },
      // });
      // if (!hasPurchased) {
      //   return res.status(403).json({
      //     success: false,
      //     message: "You can only review products you have purchased",
      //   });
      // }

      const review = {
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment,
      };

      const alreadyReviewed = product.reviews.find(
        (rev) => rev.user.toString() === req.user._id.toString(),
      );

      if (alreadyReviewed) {
        product.reviews.forEach((rev) => {
          if (rev.user.toString() === req.user._id.toString()) {
            rev.rating = rating;
            rev.comment = comment;
          }
        });
      } else {
        // Limit total reviews per product to prevent abuse
        if (product.reviews.length >= 100) {
          return res.status(400).json({
            success: false,
            message: "Maximum reviews reached for this product",
          });
        }
        product.reviews.push(review);
        product.numOfReviews = product.reviews.length;
      }

      // Recalculate average rating
      if (product.reviews.length > 0) {
        const totalRating = product.reviews.reduce(
          (sum, rev) => sum + rev.rating,
          0,
        );
        product.ratings =
          Math.round((totalRating / product.reviews.length) * 10) / 10;
      }

      await product.save();

      res.status(200).json({
        success: true,
        message: "Review added/updated",
      });
    } catch (error) {
      next(error);
    }
  },
];
