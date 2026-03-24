const express = require("express");
const router = express.Router();

const User = require("../models/user");
const Booking = require("../models/booking");
const Request = require("../models/request");
const Approval = require("../models/approval");
const Notification = require("../models/notification");

// REGISTER
router.post("/register", async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        if (!name || !email || !password || !role) {
            return res.json({
                success: false,
                message: "Please fill all fields"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.json({
                success: false,
                message: "Account already exists with this email"
            });
        }

        const newUser = new User({
            name,
            email,
            password,
            role
        });

        await newUser.save();

        res.json({
            success: true,
            message: "Account created successfully"
        });
    } catch (err) {
        console.log("REGISTER ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// LOGIN
router.post("/login", async (req, res) => {
    const { email, password, role } = req.body;

    try {
        if (!email || !password || !role) {
            return res.json({
                success: false,
                message: "Email, password and role are required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.json({
                success: false,
                message: "Account does not exist"
            });
        }

        if (user.password !== password) {
            return res.json({
                success: false,
                message: "Incorrect password"
            });
        }

        if (user.role !== role) {
            return res.json({
                success: false,
                message: "Selected role does not match your account"
            });
        }

        res.json({
            success: true,
            message: "Login successful",
            name: user.name,
            email: user.email,
            role: user.role
        });
    } catch (err) {
        console.log("LOGIN ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// BOOK ROOM -> APPROVAL FLOW
router.post("/book-room", async (req, res) => {
    const { roomName, userEmail, date, day, startTime, endTime, userRole } = req.body;

    try {
        if (!roomName || !userEmail || !date || !startTime || !endTime || !userRole) {
            return res.json({
                success: false,
                message: "Please fill all booking details"
            });
        }

        if (startTime >= endTime) {
            return res.json({
                success: false,
                message: "End time must be after start time"
            });
        }

        const existingBookings = await Booking.find({ roomName, date });
        const pendingApprovals = await Approval.find({
            resourceType: "Room",
            resourceName: roomName,
            date,
            status: "Pending"
        });

        const hasConflict = (items) =>
            items.some(item => startTime < item.endTime && endTime > item.startTime);

        if (hasConflict(existingBookings) || hasConflict(pendingApprovals)) {
            return res.json({
                success: false,
                message: "Room already booked or pending approval for this time range"
            });
        }

        let approverRole = "Administrator";
        if (userRole === "Student") approverRole = "Faculty/Staff";
        if (userRole === "Faculty/Staff") approverRole = "Administrator";

        if (userRole === "Administrator") {
            const newBooking = new Booking({
                roomName,
                userEmail,
                date,
                day,
                startTime,
                endTime
            });

            await newBooking.save();

            await Notification.create({
                userEmail,
                title: "Booking Approved",
                message: `Your booking for ${roomName} on ${date} has been approved.`,
                type: "booking"
            });

            return res.json({
                success: true,
                message: "Room booked successfully"
            });
        }

        await Approval.create({
            resourceType: "Room",
            resourceName: roomName,
            requestedBy: userEmail,
            requesterRole: userRole,
            approverRole,
            date,
            day,
            startTime,
            endTime,
            status: "Pending"
        });

        await Notification.create({
            userEmail,
            title: "Booking Request Sent",
            message: `Your booking request for ${roomName} is pending approval.`,
            type: "approval"
        });

        return res.json({
            success: true,
            message: "Booking request submitted for approval"
        });

    } catch (err) {
        console.log("BOOK ROOM ERROR:", err);
        return res.json({
            success: false,
            message: "Server error"
        });
    }
});

// MY BOOKINGS
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
        console.log("MY BOOKINGS ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// REQUEST EQUIPMENT -> APPROVAL FLOW
router.post("/request-equipment", async (req, res) => {
    try {
        const { itemName, userEmail, userRole } = req.body;

        if (!itemName || !userEmail || !userRole) {
            return res.json({
                success: false,
                message: "All fields are required"
            });
        }

        const today = new Date().toISOString().split("T")[0];

        const existingPending = await Approval.findOne({
            resourceType: "Equipment",
            resourceName: itemName,
            requestedBy: userEmail,
            status: "Pending",
            date: today
        });

        if (existingPending) {
            return res.json({
                success: false,
                message: "You already requested this equipment"
            });
        }

        const existingApprovedForUser = await Request.findOne({
            itemName,
            userEmail,
            status: "Approved",
            date: today
        });

        if (existingApprovedForUser) {
            return res.json({
                success: false,
                message: "This equipment is already approved for you"
            });
        }

        const alreadyBooked = await Request.findOne({
            itemName,
            status: "Approved",
            date: today,
            userEmail: { $ne: userEmail }
        });

        if (alreadyBooked) {
            return res.json({
                success: false,
                message: "Equipment already booked"
            });
        }

        await Approval.deleteMany({
            resourceType: "Equipment",
            resourceName: itemName,
            requestedBy: userEmail,
            status: "Rejected"
        });

        let approverRole = "Faculty/Staff";

        if (userRole === "Faculty/Staff") {
            approverRole = "Administrator";
        } else if (userRole === "Administrator") {
            approverRole = "Administrator";
        }

        if (userRole === "Administrator") {
            await Request.create({
                itemName,
                userEmail,
                status: "Approved",
                date: today
            });

            await Notification.create({
                userEmail,
                title: "Equipment Approved",
                message: `Your equipment request for ${itemName} has been approved.`,
                type: "approval"
            });

            return res.json({
                success: true,
                message: "Equipment approved successfully"
            });
        }

        await Approval.create({
            resourceType: "Equipment",
            resourceName: itemName,
            requestedBy: userEmail,
            requesterRole: userRole,
            approverRole,
            status: "Pending",
            date: today
        });

        await Notification.create({
            userEmail,
            title: "Equipment Request Sent",
            message: `Your equipment request for ${itemName} is pending approval.`,
            type: "approval"
        });

        return res.json({
            success: true,
            message: "Equipment request sent successfully"
        });

    } catch (err) {
        console.log("REQUEST EQUIPMENT ERROR:", err);
        return res.json({
            success: false,
            message: "Server error"
        });
    }
});
router.get("/dashboard-stats/:email", async (req, res) => {
    try {
        const email = req.params.email;
        const user = await User.findOne({ email });

        if (!user) {
            return res.json({
                success: false,
                message: "User not found"
            });
        }

        const now = new Date();
        const today = now.toISOString().split("T")[0];

        const allBookings = await Booking.find({});
        const activeBookings = allBookings.filter(b => {
            const bookingEnd = new Date(`${b.date}T${b.endTime}`);
            return bookingEnd >= now;
        });

        const myActiveBookings = activeBookings.filter(b => b.userEmail === email);

        const activeEquipmentRequests = await Request.find({
            status: "Approved",
            date: today
        });

        const totalEquipmentRequests = activeEquipmentRequests.length;
        const myEquipmentRequests = activeEquipmentRequests.filter(r => r.userEmail === email).length;

        const myPendingApprovals = await Approval.countDocuments({
            approverRole: user.role,
            status: "Pending"
        });

        res.json({
            success: true,
            totalBookings: activeBookings.length,
            myBookings: myActiveBookings.length,
            totalEquipmentRequests,
            myEquipmentRequests,
            myPendingApprovals
        });

    } catch (err) {
        console.log("DASHBOARD STATS ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});
module.exports = router;