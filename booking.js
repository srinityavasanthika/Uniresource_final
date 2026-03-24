const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");

// GET ALL BOOKINGS
router.get("/bookings", async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ date: 1, startTime: 1 });

        res.json({
            success: true,
            bookings
        });
    } catch (err) {
        console.log("FETCH BOOKING ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// GET ROOM STATUS FOR A DATE
router.get("/today-room-status", async (req, res) => {
    try {
        const selectedDate = req.query.date || new Date().toISOString().split("T")[0];

        const bookings = await Booking.find({ date: selectedDate }).sort({ startTime: 1 });

        res.json({
            success: true,
            date: selectedDate,
            bookings
        });
    } catch (err) {
        console.log("TODAY ROOM STATUS ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// CANCEL BOOKING
router.delete("/cancel-booking/:id", async (req, res) => {
    try {
        const deletedBooking = await Booking.findByIdAndDelete(req.params.id);

        if (!deletedBooking) {
            return res.json({
                success: false,
                message: "Booking not found"
            });
        }

        res.json({
            success: true,
            message: "Booking cancelled"
        });
    } catch (err) {
        console.log("CANCEL BOOKING ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

router.get("/my-bookings/:email", async (req, res) => {
    try {
        const bookings = await Booking.find({
            userEmail: req.params.email
        }).sort({ date: 1, startTime: 1 });

        res.json({
            success: true,
            bookings
        });
    } catch (err) {
        console.log("FETCH MY BOOKINGS ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});
module.exports = router;