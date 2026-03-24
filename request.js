const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "Approved"
    },
    date: {
        type: String,
        required: true,
        default: () => new Date().toISOString().split("T")[0]
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.models.Request || mongoose.model("Request", RequestSchema);