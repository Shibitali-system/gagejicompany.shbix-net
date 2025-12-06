import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import airpayRoutes from "./routes/airpay.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// AirPay routes
app.use("/api/airpay", airpayRoutes);

// health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(port, () => {
  console.log(`AirPay server listening on http://localhost:${port}`);
});
