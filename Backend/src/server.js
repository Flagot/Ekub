import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cron from "node-cron";
import { toNodeHandler } from "better-auth/node";

import { createAuth } from "./auth/auth.config.js";
import { runPaymentDueReminder } from "./jobs/paymentDueReminder.job.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import { listPublicGroupsGuest } from "./controllers/group.controller.js";
import groupRoutes from "./routes/group.routes.js";
import contributionRoutes from "./routes/contribution.routes.js";
import payoutRoutes from "./routes/payout.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ekub";

// CORS with credentials for cookie-based auth (frontend may be on different port in dev)
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "https://ekub-mocha.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

// Health check (no body parsing needed)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB");

    // Every day at 8:00 AM (server time): notify members whose contribution is due today
    cron.schedule("0 8 * * *", runPaymentDueReminder);
    console.log("Scheduled daily payment-due reminder (8:00 AM)");

    const db = mongoose.connection.db;
    const auth = createAuth(db);

    // Mount Better Auth first (before express.json())
    app.all("/api/auth/*", toNodeHandler(auth));

    app.use(express.json());
    app.use(morgan("dev"));

    // Public endpoint for landing page (no auth)
    app.get("/api/public/ekubs", listPublicGroupsGuest);

    const authMiddleware = createAuthMiddleware(auth);
    app.use("/api/groups", authMiddleware, groupRoutes);
    app.use("/api/contributions", authMiddleware, contributionRoutes);
    app.use("/api/payouts", authMiddleware, payoutRoutes);
    app.use("/api/notifications", authMiddleware, notificationRoutes);

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

start();
