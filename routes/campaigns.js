import express from "express";
import Campaign from "../models/Campaign.js";

const router = express.Router();

// Get all campaigns
router.get("/", async (req, res) => {
    try {
        const campaigns = await Campaign.find().sort({ date: -1 });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Create a new campaign (Optional, if needed separate from bulk SMS)
router.post("/", async (req, res) => {
    const { message } = req.body;
    try {
        const newCampaign = new Campaign({ message, totalSent: 0 });
        await newCampaign.save();
        res.status(201).json(newCampaign);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a campaign
router.delete("/:id", async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }
        res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
