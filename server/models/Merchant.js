const mongoose = require("mongoose");

const merchantSchema = new mongoose.Schema(
  {
    qrId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    merchantName: {
      type: String,
      required: true,
      trim: true,
    },

    upiId: {
      type: String,
      required: true,
      trim: true,
    },

    mcc: {
      type: String,
      required: true,
      trim: true,
    },

    maxChunk: {
      type: Number,
      required: true,
      min: 1,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Merchant",
  merchantSchema
);