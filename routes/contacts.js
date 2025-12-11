import express from "express";
import multer from "multer";
import { parse } from "csv-parse";
import fs from "fs";
import Contact from "../models/Contact.js";
import CampaignList from "../models/CampaignList.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });



router.post("/upload", upload.single("file"), async (req, res) => {
    const contacts = [];
    let campaignId = null;

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    try {
        if (req.body.campaignName) {
            const campaign = await new CampaignList({ name: req.body.campaignName }).save();
            campaignId = campaign._id;
        }

        fs.createReadStream(req.file.path)
            .pipe(parse({ columns: true, trim: true, skip_empty_lines: true, bom: true }))
            .on("data", (row) => {
                if (row.name && row.phone) {
                    const contact = {
                        name: row.name,
                        phone: row.phone,
                    };
                    if (campaignId) contact.campaignId = campaignId;
                    contacts.push(contact);
                }
            })
            .on("end", async () => {
                try {
                    await Contact.insertMany(contacts, { ordered: false });
                    fs.unlinkSync(req.file.path);
                    res.json({ success: true, total: contacts.length, campaignId });
                } catch (error) {
                    // Start of Selection
                    if (error.code === 11000 || error.writeErrors) {
                        // Some duplicates found
                        const insertedCount = error.insertedDocs ? error.insertedDocs.length : (contacts.length - error.writeErrors.length);
                        res.json({
                            success: true,
                            total: insertedCount,
                            message: `Uploaded ${insertedCount} contacts. Skipped ${contacts.length - insertedCount} duplicates.`,
                            campaignId
                        });
                        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    } else {
                        res.status(500).json({ success: false, message: error.message });
                    }
                }
            })
            .on("error", (error) => {
                res.status(500).json({ success: false, message: error.message });
            });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get all campaign lists
router.get("/lists", async (req, res) => {
    try {
        const lists = await CampaignList.find().sort({ date: -1 });
        res.json(lists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all contacts
router.get("/", async (req, res) => {
    try {
        const contacts = await Contact.find();
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a contact
router.delete("/:id", async (req, res) => {
    try {
        await Contact.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Contact deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Bulk delete contacts
router.post("/delete-batch", async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "No IDs provided" });
    }

    try {
        await Contact.deleteMany({ _id: { $in: ids } });
        res.json({ success: true, message: "Contacts deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
