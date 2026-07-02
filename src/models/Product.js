const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: [50, "Name cannot exceed 50 characters"],
    },
    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxLength: [500, "Comment cannot exceed 500 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter product name"],
      maxLength: [100, "Name cannot exceed 100 characters"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Please enter product description"],
      trim: true,
      maxLength: [2000, "Description cannot exceed 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Please enter product price"],
      min: [0, "Price cannot be negative"],
      max: [99999999, "Price is too high"],
      validate: {
        validator: function (v) {
          return Number.isFinite(v) && v >= 0;
        },
        message: "Please enter a valid price",
      },
    },
    cuttedPrice: {
      type: Number,
      required: [true, "Please enter cutted price"],
      min: [0, "Cutted price cannot be negative"],
      validate: {
        validator: function (v) {
          return Number.isFinite(v) && v >= 0;
        },
        message: "Please enter a valid cutted price",
      },
    },
    images: [
      {
        public_id: {
          type: String,
          required: true,
          trim: true,
        },
        url: {
          type: String,
          required: true,
          match: [/^https?:\/\/.+\..+/, "Please enter a valid image URL"],
        },
      },
    ],
    category: {
      type: String,
      required: [true, "Please enter product category"],
      trim: true,
      lowercase: true,
      index: true,
    },
    stock: {
      type: Number,
      required: [true, "Please enter product stock"],
      min: [0, "Stock cannot be negative"],
      max: [9999, "Stock cannot exceed 9999"],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a whole number",
      },
    },
    ratings: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
    },
    numOfReviews: {
      type: Number,
      default: 0,
      min: [0, "Number of reviews cannot be negative"],
    },
    reviews: [reviewSchema],
    seller: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for common queries
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ ratings: -1 });

module.exports = mongoose.model("Product", productSchema);
