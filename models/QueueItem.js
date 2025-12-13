import mongoose from "mongoose";

const QueueItemSchema = new mongoose.Schema({
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign" },
    phone: String,
    message: String,
    status: { type: String, default: "PENDING" }, // PENDING, SENT, FAILED
    sendAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Index for efficient querying by worker
QueueItemSchema.index({ status: 1, sendAt: 1 });

export default mongoose.model("QueueItem", QueueItemSchema);
