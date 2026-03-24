const express = require("express");
const router = express.Router();
const Notification = require("../models/notification");

// GET USER NOTIFICATIONS - ONLY TODAY
router.get("/notifications/:email", async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const notifications = await Notification.find({
            userEmail: req.params.email,
            createdAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            notifications
        });
    } catch (err) {
        console.log("GET NOTIFICATIONS ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// MARK AS READ
router.post("/notifications/read/:id", async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });

        res.json({
            success: true,
            message: "Notification marked as read"
        });
    } catch (err) {
        console.log("READ NOTIFICATION ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;