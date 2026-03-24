const express = require("express");
const router = express.Router();

const Approval = require("../models/approval");
const Booking = require("../models/booking");
const Request = require("../models/request");
const Notification = require("../models/notification");

// GET PENDING APPROVALS BY ROLE
router.get("/approvals/:role", async (req, res) => {
    try {
        const approvals = await Approval.find({
            approverRole: req.params.role,
            status: "Pending"
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            approvals
        });
    } catch (err) {
        console.log("GET APPROVALS ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// GET ALL MY APPROVALS
router.get("/my-approvals/:email", async (req, res) => {
    try {
        const approvals = await Approval.find({
            requestedBy: req.params.email
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            approvals
        });
    } catch (err) {
        console.log("GET MY APPROVALS ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// GET ONLY MY EQUIPMENT APPROVALS
router.get("/my-equipment-approvals/:email", async (req, res) => {
    try {
        const approvals = await Approval.find({
            requestedBy: req.params.email,
            resourceType: "Equipment"
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            approvals
        });
    } catch (err) {
        console.log("GET MY EQUIPMENT APPROVALS ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// GET ALL CURRENTLY APPROVED EQUIPMENT REQUESTS
router.get("/equipment-requests", async (req, res) => {
    try {
        const requests = await Request.find({
            status: "Approved"
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            requests
        });
    } catch (err) {
        console.log("GET EQUIPMENT REQUESTS ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// APPROVE REQUEST
router.post("/approve/:id", async (req, res) => {
    try {
        const approval = await Approval.findById(req.params.id);

        if (!approval) {
            return res.json({
                success: false,
                message: "Approval request not found"
            });
        }

        if (approval.resourceType === "Equipment") {
            const approvalDate = approval.date || new Date().toISOString().split("T")[0];

            const alreadyBooked = await Request.findOne({
                itemName: approval.resourceName,
                status: "Approved",
                date: approvalDate,
                userEmail: { $ne: approval.requestedBy }
            });

            if (alreadyBooked) {
                approval.status = "Rejected";
                approval.remarks = "Equipment already booked";
                await approval.save();

                await Notification.create({
                    userEmail: approval.requestedBy,
                    title: "Equipment Rejected",
                    message: `Your equipment request for ${approval.resourceName} was rejected because it is already booked.`,
                    type: "approval"
                });

                return res.json({
                    success: false,
                    message: "Equipment already booked"
                });
            }
        }

        approval.status = "Approved";
        await approval.save();

        if (approval.resourceType === "Room") {
            await Booking.create({
                roomName: approval.resourceName,
                userEmail: approval.requestedBy,
                date: approval.date,
                day: approval.day,
                startTime: approval.startTime,
                endTime: approval.endTime
            });
        }

        if (approval.resourceType === "Equipment") {
    const requestDate = approval.date || new Date().toISOString().split("T")[0];

    const existingApprovedRequest = await Request.findOne({
        itemName: approval.resourceName,
        userEmail: approval.requestedBy,
        status: "Approved",
        date: requestDate
    });

    if (!existingApprovedRequest) {
        await Request.create({
            itemName: approval.resourceName,
            userEmail: approval.requestedBy,
            status: "Approved",
            date: requestDate
        });
    }
}

        await Notification.create({
            userEmail: approval.requestedBy,
            title: `${approval.resourceType} Approved`,
            message: `Your ${approval.resourceType.toLowerCase()} request for ${approval.resourceName} has been approved.`,
            type: "approval"
        });

        res.json({
            success: true,
            message: "Request approved"
        });
    } catch (err) {
        console.log("APPROVE ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// REJECT REQUEST
router.post("/reject/:id", async (req, res) => {
    try {
        const { remarks } = req.body;

        const approval = await Approval.findById(req.params.id);

        if (!approval) {
            return res.json({
                success: false,
                message: "Approval request not found"
            });
        }

        approval.status = "Rejected";
        approval.remarks = remarks || "";
        await approval.save();

        await Notification.create({
            userEmail: approval.requestedBy,
            title: `${approval.resourceType} Rejected`,
            message: `Your ${approval.resourceType.toLowerCase()} request for ${approval.resourceName} was rejected.`,
            type: "approval"
        });

        res.json({
            success: true,
            message: "Request rejected"
        });
    } catch (err) {
        console.log("REJECT ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// CANCEL PENDING EQUIPMENT REQUEST
router.delete("/cancel-equipment-approval/:id", async (req, res) => {
    try {
        const deletedApproval = await Approval.findOneAndDelete({
            _id: req.params.id,
            resourceType: "Equipment",
            status: "Pending"
        });

        if (!deletedApproval) {
            return res.json({
                success: false,
                message: "Pending equipment request not found"
            });
        }

        await Notification.create({
            userEmail: deletedApproval.requestedBy,
            title: "Equipment Request Cancelled",
            message: `Your request for ${deletedApproval.resourceName} was cancelled.`,
            type: "request"
        });

        res.json({
            success: true,
            message: "Pending equipment request cancelled"
        });
    } catch (err) {
        console.log("CANCEL EQUIPMENT APPROVAL ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

// MARK EQUIPMENT USAGE COMPLETE
router.post("/equipment-usage-complete", async (req, res) => {
    try {
        const { itemName, userEmail } = req.body;

        console.log("USAGE COMPLETE BODY:", req.body);

        if (!itemName || !userEmail) {
            return res.json({
                success: false,
                message: "Item name and user email are required"
            });
        }

        const deleted = await Request.findOneAndDelete({
    userEmail: userEmail.trim(),
    status: "Approved",
    itemName: { $regex: `^${itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: "i" }
});

        console.log("DELETED APPROVED REQUEST:", deleted);

        if (!deleted) {
            return res.json({
                success: false,
                message: "Approved equipment record not found"
            });
        }

        await Approval.deleteMany({
    resourceType: "Equipment",
    requestedBy: userEmail.trim(),
    status: "Approved",
    resourceName: {
        $regex: `^${itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i"
    }
});

        await Notification.create({
            userEmail,
            title: "Equipment Usage Completed",
            message: `Your usage of ${itemName} has been marked as complete.`,
            type: "request"
        });

        return res.json({
            success: true,
            message: "Equipment usage marked as complete"
        });

    } catch (err) {
        console.log("EQUIPMENT USAGE COMPLETE ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});
router.delete("/delete-equipment-approval/:id", async (req, res) => {
    try {
        const deletedApproval = await Approval.findOneAndDelete({
            _id: req.params.id,
            resourceType: "Equipment",
            status: "Rejected"
        });

        if (!deletedApproval) {
            return res.json({
                success: false,
                message: "Rejected equipment request not found"
            });
        }

        res.json({
            success: true,
            message: "Rejected equipment request removed"
        });
    } catch (err) {
        console.log("DELETE REJECTED EQUIPMENT APPROVAL ERROR:", err);
        res.json({
            success: false,
            message: "Server error"
        });
    }
});

module.exports = router;