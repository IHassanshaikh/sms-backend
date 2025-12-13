import QueueItem from "../models/QueueItem.js";
import SmsLog from "../models/SmsLog.js";
import Campaign from "../models/Campaign.js";
import { sendSMS } from "./sendSMS.js";

let isRunning = false;

export const startWorker = () => {
    console.log("Worker: SMS Scheduler started. Polling every 10s.");
    setInterval(processQueue, 10000); // Check every 10 seconds
};

const processQueue = async () => {
    if (isRunning) return; // Prevent overlapping runs
    isRunning = true;

    try {
        const now = new Date();

        // 1. Fetch pending items that are due
        // Limit to 5 per tick to be safe with rate limits (Seven.io might differ, but safe start)
        const pendingItems = await QueueItem.find({
            status: "PENDING",
            sendAt: { $lte: now }
        }).limit(5);

        if (pendingItems.length === 0) {
            isRunning = false;
            return;
        }

        console.log(`Worker: Processing ${pendingItems.length} queued messages...`);

        for (const item of pendingItems) {
            try {
                // Send SMS
                const result = await sendSMS(item.phone, item.message);
                const success = result.success;

                // Extract Message ID
                const msgId = success && result.response.messages && result.response.messages[0]
                    ? result.response.messages[0].id
                    : null;

                // Update QueueItem
                item.status = success ? "SENT" : "FAILED";
                await item.save();

                // Create Log
                await SmsLog.create({
                    phone: item.phone,
                    message: item.message,
                    status: success ? "SENT" : "FAILED",
                    messageId: msgId,
                    response: result.response,
                });

                // Update Campaign Stats (Optional but good)
                // We find the campaign and increment totalSent by 1 if success
                if (success && item.campaignId) {
                    await Campaign.findByIdAndUpdate(item.campaignId, { $inc: { totalSent: 1 } });
                }

            } catch (err) {
                console.error(`Worker Error processing item ${item._id}:`, err);
                item.status = "FAILED";
                await item.save();
            }
        }

    } catch (error) {
        console.error("Worker: Error in processQueue:", error);
    } finally {
        isRunning = false;
    }
};
