import express from "express";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Supabase client
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Pesapal sandbox/production keys
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

// --- Helper: generate OAuth signature ---
function generateOAuthSignature(baseString, consumerSecret) {
  return crypto.createHmac("sha1", consumerSecret + "&").update(baseString).digest("base64");
}

// --- POST /api/pesapal/create-order ---
router.post("/create-order", async (req, res) => {
  try {
    const { subscription_id, amount, package_label, first_name, email } = req.body;

    if (!subscription_id || !amount || !first_name || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const pesapalBaseUrl = "https://demo.pesapal.com/api/PostPesapalDirectOrderV4"; // sandbox
    const type = "MERCHANT";
    const reference = subscription_id.toString();
    const description = package_label;

    // OAuth params
    const oauth_nonce = crypto.randomBytes(16).toString("hex");
    const oauth_timestamp = Math.floor(Date.now() / 1000);
    const oauth_consumer_key = PESAPAL_CONSUMER_KEY;
    const oauth_signature_method = "HMAC-SHA1";
    const oauth_version = "1.0";

    // Construct query string (sorted params)
    const params = new URLSearchParams({
      amount: amount.toString(),
      description,
      type,
      reference,
      first_name,
      last_name: "",
      email,
      phone_number: "",
      oauth_consumer_key,
      oauth_nonce,
      oauth_signature_method,
      oauth_timestamp: oauth_timestamp.toString(),
      oauth_version,
    });

    const baseString = `GET&${encodeURIComponent(pesapalBaseUrl)}&${encodeURIComponent(params.toString())}`;
    const oauth_signature = generateOAuthSignature(baseString, PESAPAL_CONSUMER_SECRET);

    params.append("oauth_signature", oauth_signature);

    const finalUrl = `${pesapalBaseUrl}?${params.toString()}`;

    return res.json({ url: finalUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create Pesapal order", details: err.message });
  }
});

export default router;
