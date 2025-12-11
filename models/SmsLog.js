import mongoose from "mongoose";

const SmsLogSchema = new mongoose.Schema({
    phone: String,
    message: String,
    status: String,
    messageId: String,
    response: Object,
    clicks: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});

export default mongoose.model("SmsLog", SmsLogSchema);
