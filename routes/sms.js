import express from "express";
import Contact from "../models/Contact.js";
import SmsLog from "../models/SmsLog.js";
import Campaign from "../models/Campaign.js";
import { sendSMS } from "../utils/sendSMS.js";
import axios from "axios";

const router = express.Router();

// Webhook Management
router.get("/hooks", async (req, res) => {
    try {
        const response = await axios.get("https://gateway.seven.io/api/hooks", {
            headers: { "X-Api-Key": process.env.SEVEN_API_KEY }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/hooks", async (req, res) => {
    try {
        const { target_url, event_type } = req.body;
        const response = await axios.post("https://gateway.seven.io/api/hooks", {
            target_url,
            event_type: event_type || "all",
            request_method: "POST"
        }, {
            headers: {
                "X-Api-Key": process.env.SEVEN_API_KEY,
                "Content-Type": "application/json"
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear All SMS Logs
router.delete("/logs", async (req, res) => {
    try {
        await SmsLog.deleteMany({});
        res.json({ message: "All logs cleared" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Bulk SMS Sender
router.post("/bulk", async (req, res) => {
    const { message, campaignId, interval, startTime } = req.body;
    console.log("Bulk SMS Request:", { interval, startTime, typeInterval: typeof interval });
    // interval is in minutes
    // startTime is an ISO date string

    const query = campaignId ? { campaignId } : {};
    const contacts = await Contact.find(query);

    if (!contacts.length) {
        return res.status(400).json({ success: false, message: "No contacts found" });
    }

    // Determine start time (default to NOW if not set or invalid)
    let start = startTime ? new Date(startTime) : new Date();
    if (isNaN(start.getTime())) start = new Date();

    const isScheduled = (interval && Number(interval) > 0) || startTime;
    console.log("Is Scheduled?", isScheduled);

    if (isScheduled) {
        const queueItems = [];
        let scheduledTime = new Date(start);

        // Prepare Queue Items
        contacts.forEach((contact, index) => {
            // Calculate send time for this message
            // First message goes at 'start', next at 'start + interval', etc.
            // If interval is 0 but startTime is set, they all go at startTime (bulk blast at future time)
            const delayInMs = index * (interval || 0) * 60 * 1000;
            const sendAt = new Date(scheduledTime.getTime() + delayInMs);

            queueItems.push({
                campaignId: campaignId || null, // Optional linkage
                phone: contact.phone,
                message,
                status: "PENDING",
                sendAt: sendAt
            });
        });

        await import("../models/QueueItem.js").then(m => m.default.insertMany(queueItems));

        // Create Campaign Record
        await Campaign.create({
            message,
            totalSent: 0, // Will be updated as they send
            interval: interval || 0,
            startTime: start,
            status: "RUNNING"
        });

        return res.json({
            success: true,
            message: `Campaign scheduled. ${contacts.length} messages queued.`,
            totalSent: 0
        });

    } else {
        // LEGACY / IMMEDIATE SEND
        let sentCount = 0;

        for (let c of contacts) {
            const result = await sendSMS(c.phone, message);

            const msgId = result.success && result.response.messages && result.response.messages[0]
                ? result.response.messages[0].id
                : null;

            await SmsLog.create({
                phone: c.phone,
                message,
                status: result.success ? "SENT" : "FAILED",
                messageId: msgId,
                response: result.response,
            });

            if (result.success) sentCount++;
        }

        await Campaign.create({
            message,
            totalSent: sentCount,
            status: "COMPLETED"
        });

        return res.json({
            success: true,
            message: "Campaign completed",
            totalSent: sentCount,
        });
    }
});

// Get SMS Logs
router.get("/logs", async (req, res) => {
    try {
        const query = {};
        if (req.query.clicksOnly === "true") {
            query.clicks = { $gt: 0 };
        }
        const logs = await SmsLog.find(query).sort({ date: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



// Webhook for Delivery Reports
// Webhook for Delivery Reports & Tracking
router.post("/webhook", async (req, res) => {
    try {
        console.log("Webhook Received Payload:", JSON.stringify(req.body, null, 2));

        const eventType = req.body.webhook_event;
        const data = req.body.data;

        // 1. Handle Delivery Reports (DLR)
        if (eventType === 'dlr' && data && data.msg_id) {
            await SmsLog.findOneAndUpdate(
                { messageId: data.msg_id },
                { status: data.status.toUpperCase() }
            );
            return res.status(200).send("DLR Processed");
        }

        // 2. Handle Tracking (Clicks/Opens)
        if (eventType === 'tracking' && data && data.sms_id) {
            // Increment clicks just in case, or set total_clicks if provided
            const clicks = data.total_clicks || 1;
            await SmsLog.findOneAndUpdate(
                { messageId: data.sms_id },
                {
                    $set: {
                        clicks: clicks,
                        status: "READ"
                    }
                }
            );
            return res.status(200).send("Tracking Processed");
        }

        // 3. Fallback / Legacy (Direct ID/Status)
        const { id, status } = req.body;
        if (id && status) {
            await SmsLog.findOneAndUpdate(
                { messageId: id },
                { status: status.toUpperCase() }
            );
            return res.status(200).send("Legacy DLR Processed");
        }

        // If no match
        console.warn("Unknown webhook format");
        res.status(200).send("Ignored");

    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send("Error");
    }
});

export default router;
