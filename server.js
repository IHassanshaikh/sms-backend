import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import contactRoutes from "./routes/contacts.js";
import smsRoutes from "./routes/sms.js";
import campaignRoutes from "./routes/campaigns.js";
import { startWorker } from "./utils/scheduler.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

// Start Background Worker
startWorker();

app.use("/api/contacts", contactRoutes);
app.use("/api/sms", smsRoutes);
app.use("/api/campaigns", campaignRoutes);

app.get("/", (req, res) => {
    res.send("SMS System Backend is Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
