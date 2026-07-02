const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: [1, "Quantity must be at least 1"],
    max: [10, "Maximum 10 items per product"],
    validate: {
      validator: Number.isInteger,
      message: "Quantity must be a whole number",
    },
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true, // One cart per user
    },
    items: {
      type: [cartItemSchema],
      validate: [
        function (items) {
          return items.length <= 50; // Max 50 different items
        },
        "Cart cannot have more than 50 items",
      ],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Cart", cartSchema);
