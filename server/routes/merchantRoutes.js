const express = require("express");
const crypto = require("crypto");

const Merchant = require("../models/Merchant");

const router = express.Router();

/*
  Create merchant
  POST /api/merchants
*/
router.post("/", async (req, res) => {
  try {
    const { merchantName, upiId, mcc, maxChunk } = req.body;

    if (!merchantName || !upiId || !mcc || !maxChunk) {
      return res.status(400).json({
        message: "Merchant name, UPI ID, MCC and maximum chunk are required",
      });
    }

    if (
      typeof merchantName !== "string" ||
      typeof upiId !== "string" ||
      typeof mcc !== "string"
    ) {
      return res.status(400).json({
        message: "Merchant name, UPI ID and MCC must be strings",
      });
    }

    if (!/^\d{4}$/.test(mcc.trim())) {
      return res.status(400).json({
        message: "MCC must be exactly 4 digits",
      });
    }

    const chunk = Number(maxChunk);

    if (!Number.isFinite(chunk) || chunk <= 0) {
      return res.status(400).json({
        message: "Maximum chunk must be a positive number",
      });
    }

    const qrId = crypto.randomBytes(12).toString("hex");

    const merchant = await Merchant.create({
      qrId,
      merchantName: merchantName.trim(),
      upiId: upiId.trim(),
      mcc: mcc.trim(),
      maxChunk: chunk,
    });

    res.status(201).json({
      message: "Merchant created successfully",

      qrId: merchant.qrId,
    });
  } catch (error) {
    console.error("Merchant creation error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

/*
  Get merchant by QR ID
  GET /api/merchants/:qrId
*/
router.get("/:qrId", async (req, res) => {
  try {
    const { qrId } = req.params;

    const merchant = await Merchant.findOne({
      qrId,
      active: true,
    }).select("qrId merchantName upiId mcc maxChunk");

    if (!merchant) {
      return res.status(404).json({
        message: "Invalid or inactive payment QR",
      });
    }

    res.json({
      qrId: merchant.qrId,
      merchantName: merchant.merchantName,
      upiId: merchant.upiId,
      mcc: merchant.mcc,
      maxChunk: merchant.maxChunk,
    });
  } catch (error) {
    console.error("Merchant lookup error:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

module.exports = router;
