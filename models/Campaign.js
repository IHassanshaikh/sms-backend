import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema({
    message: String,
    date: { type: Date, default: Date.now },
    totalSent: Number,
});

export default mongoose.model("Campaign", CampaignSchema);
