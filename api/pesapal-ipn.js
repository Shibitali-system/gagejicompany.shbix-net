// pesapal-ipn.js
import express from "express";
import crypto from "crypto";
import fetch from "node-fetch"; // au native fetch in Node 18+
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Supabase client
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Pesapal keys
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

// --- IPN endpoint ---
app.post("/pesapal/ipn", async (req, res) => {
  try {
    const {
      pesapal_transaction_tracking_id,
      pesapal_merchant_reference,
      pesapal_notification_type,
    } = req.body;

    if (!pesapal_transaction_tracking_id || !pesapal_merchant_reference) {
      return res.status(400).send("Missing required Pesapal data.");
    }

    // 1️⃣ Validate transaction with Pesapal API
    const oauth_timestamp = Math.floor(Date.now() / 1000);
    const oauth_nonce = crypto.randomBytes(16).toString("hex");

    const baseUrl = `https://demo.pesapal.com/api/QueryPaymentStatus?pesapal_merchant_reference=${pesapal_merchant_reference}&pesapal_transaction_tracking_id=${pesapal_transaction_tracking_id}`;
    const signatureBase = `GET&${encodeURIComponent(baseUrl)}&`;
    const signingKey = `${PESAPAL_CONSUMER_SECRET}&`;
    const oauth_signature = crypto
      .createHmac("sha1", signingKey)
      .update(signatureBase)
      .digest("base64");

    const url = `${baseUrl}&oauth_consumer_key=${PESAPAL_CONSUMER_KEY}&oauth_nonce=${oauth_nonce}&oauth_signature=${encodeURIComponent(
      oauth_signature
    )}&oauth_signature_method=HMAC-SHA1&oauth_timestamp=${oauth_timestamp}&oauth_version=1.0`;

    const response = await fetch(url);
    const text = await response.text();

    // Extract status
    const statusMatch = text.match(/<status>(.*?)<\/status>/i);
    const paymentStatus = statusMatch ? statusMatch[1] : "UNKNOWN";

    // 2️⃣ Update Supabase subscriptions table
    const { data: subscriptionRecord, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", pesapal_merchant_reference)
      .single();

    if (subError || !subscriptionRecord) {
      return res.status(404).send("Subscription record not found.");
    }

    let updatedStatus = "pending";
    if (paymentStatus === "COMPLETED") updatedStatus = "completed";
    else if (paymentStatus === "FAILED") updatedStatus = "failed";

    await supabase
      .from("subscriptions")
      .update({ status: updatedStatus, updated_at: new Date().toISOString() })
      .eq("id", subscriptionRecord.id);

    // 3️⃣ Update subscription usage if completed
    if (updatedStatus === "completed") {
      const now = new Date().toISOString();
      const currentDays = subscriptionRecord.usagedays || 0;
      const daysPassed = subscriptionRecord.startdate
        ? Math.floor((new Date() - new Date(subscriptionRecord.startdate)) / (1000 * 60 * 60 * 24))
        : 0;

      const remainingDays = Math.max(0, currentDays - daysPassed);
      const newUsageDays = remainingDays + parseInt(subscriptionRecord.package_days || 30); // default 30

      await supabase
        .from("subscriptions")
        .update({ usagedays: newUsageDays, startdate: subscriptionRecord.startdate || now })
        .eq("id", subscriptionRecord.id);
    }

    res.status(200).send("IPN processed successfully.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing IPN.");
  }
});

// Server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pesapal IPN server running on port ${PORT}`));
