import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema({
    name: String,
    phone: { type: String, required: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "CampaignList" }
}, { timestamps: true });

ContactSchema.index({ phone: 1, campaignId: 1 }, { unique: true });

export default mongoose.model("Contact", ContactSchema);
