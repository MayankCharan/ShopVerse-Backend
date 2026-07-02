const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
    validate: {
      validator: Number.isInteger,
      message: "Quantity must be a whole number",
    },
  },
  image: {
    type: String,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },
    shippingInfo: {
      address: {
        type: String,
        required: true,
        trim: true,
        maxLength: [200, "Address cannot exceed 200 characters"],
      },
      city: {
        type: String,
        required: true,
        trim: true,
        maxLength: [100, "City cannot exceed 100 characters"],
      },
      state: {
        type: String,
        required: true,
        trim: true,
        maxLength: [100, "State cannot exceed 100 characters"],
      },
      country: {
        type: String,
        required: true,
        trim: true,
        maxLength: [100, "Country cannot exceed 100 characters"],
      },
      pinCode: {
        type: String, // Changed from Number to String (preserves leading zeros)
        required: true,
        trim: true,
        match: [/^\d{5,6}$/, "Please enter a valid pin code"],
      },
      phoneNo: {
        type: String, // Changed from Number to String (preserves leading zeros, handles + prefix)
        required: true,
        trim: true,
        match: [/^\+?[\d\s-]{10,15}$/, "Please enter a valid phone number"],
      },
    },
    orderItems: [orderItemSchema],
    paymentInfo: {
      id: {
        type: String,
        trim: true,
      },
      status: {
        type: String,
        enum: [
          "Pending",
          "Completed",
          "Failed",
          "Refunded",
          "Partially Refunded",
          "Cash on Delivery",
        ],
        default: "Pending",
      },
    },
    paidAt: {
      type: Date,
    },
    itemsPrice: {
      type: Number,
      required: true,
      min: [0, "Items price cannot be negative"],
      default: 0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      min: [0, "Shipping price cannot be negative"],
      default: 0,
    },
    taxPrice: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price cannot be negative"],
      default: 0,
    },
    orderStatus: {
      type: String,
      enum: {
        values: [
          "Processing",
          "Confirmed",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Returned",
          "Refunded",
        ],
        message: "Invalid order status",
      },
      default: "Processing",
    },
    deliveredAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    idempotencyKey: {
      type: String,
      index: true,
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

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ "paymentInfo.id": 1 }, { sparse: true });

// Generate order number before saving
orderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
});

module.exports = mongoose.model("Order", orderSchema);
