import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import authRouter from "./routes/auth.routes.js";
import groupRouter from "./routes/group.routes.js";
import { listPublicGroupsGuest } from "./controllers/group.controller.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "Ekub";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("/api/public/ekubs", listPublicGroupsGuest);

app.use("/api/auth", authRouter);
app.use("/api/groups", groupRouter);

const startServer = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required. Add it to Backend/.env");
  }

  await mongoose.connect(MONGO_URI, { dbName: MONGO_DB_NAME });
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});
