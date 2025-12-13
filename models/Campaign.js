import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema({
    message: String,
    date: { type: Date, default: Date.now },
    totalSent: Number,
    interval: { type: Number, default: 0 }, // Interval in minutes
    startTime: { type: Date, default: Date.now },
    status: { type: String, default: "COMPLETED" }, // COMPLETED, RUNNING
});

export default mongoose.model("Campaign", CampaignSchema);
