import express from "express";
import crypto from "crypto";

const router = express.Router();

// Utility functions
function checksum(data) {
  const sortedKeys = Object.keys(data).sort();
  let str = "";
  sortedKeys.forEach(key => {
    str += data[key];
  });
  return crypto.createHash("sha256").update(str + new Date().toISOString().slice(0,10)).digest("hex");
}

function encrypt(data, encryptionKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(encryptionKey, "hex"), iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "base64");
  encrypted += cipher.final("base64");
  return iv.toString("hex") + encrypted;
}

// Create AirPay order
router.post("/create-order", async (req, res) => {
  try {
    const {
      subscription_id,
      amount,
      package_label,
      first_name,
      email
    } = req.body;

    const orderId = `ORD${Date.now()}`;
    const buyerData = {
      buyer_email: email,
      buyer_phone: "99999999",
      buyer_firstname: first_name,
      buyer_lastname: "",
      amount: amount.toFixed(2),
      orderid: orderId,
      currency_code: "834",
      iso_currency: "TZS"
    };

    const privatekey = crypto.createHash("sha256")
      .update(`${process.env.AIRPAY_SECRET}@${process.env.AIRPAY_USERNAME}:|:${process.env.AIRPAY_PASSWORD}`)
      .digest("hex");

    const encdata = encrypt(buyerData, process.env.AIRPAY_ENCRYPTION_KEY);
    const chk = checksum(buyerData);

    res.json({
      url: `https://payments.airpay.tz/pay/v1/?token=${process.env.AIRPAY_TOKEN}`,
      privatekey,
      merchant_id: process.env.AIRPAY_MERCHANT_ID,
      encdata,
      checksum: chk,
      orderId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create AirPay order", details: err.message });
  }
});

export default router;
