let selectedRole = "";
let currentBookingButton = null;

// ROLE BUTTON SELECTION
document.querySelectorAll(".role-btn").forEach(button => {
    button.addEventListener("click", function () {
        const group = this.parentElement.querySelectorAll(".role-btn");
        group.forEach(btn => btn.classList.remove("active"));
        this.classList.add("active");
        selectedRole = this.innerText.trim();
    });
});

// LOGIN FUNCTION
async function loginUser() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (email === "" || password === "") {
        alert("Please enter email and password");
        return;
    }

    if (selectedRole === "") {
        alert("Please select a role");
        return;
    }

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password, role: selectedRole })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("userName", data.name);
            localStorage.setItem("userEmail", data.email);
            localStorage.setItem("userRole", data.role);

            alert("Login successful");
            window.location.href = "dashboard.html";
        } else {
            alert(data.message);
        }

    } catch (error) {
        console.log(error);
        alert("Server error");
    }
}

function logoutUser() {
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    window.location.href = "login.html";
}

// REGISTER FUNCTION
async function registerUser() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (name === "" || email === "" || password === "") {
        alert("Please fill all fields");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    if (selectedRole === "") {
        alert("Please select a role");
        return;
    }

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password,
                role: selectedRole
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("Account created successfully");
            if (typeof showSignin === "function") {
                showSignin();
            }
        } else {
            alert(data.message);
        }

    } catch (error) {
        console.log(error);
        alert("Server error");
    }
}

function loadProfile() {
    const userName = localStorage.getItem("userName");
    const userRole = localStorage.getItem("userRole");

    if (!userName) {
        window.location.href = "login.html";
        return;
    }

    const profileName = document.getElementById("profileName");
    const profileIcon = document.getElementById("profileIcon");
    const profileRole = document.getElementById("profileRole");

    if (profileName) profileName.innerText = userName;
    if (profileIcon && userName) profileIcon.innerText = userName.charAt(0).toUpperCase();
    if (profileRole) profileRole.innerText = userRole || "User";
}

// SECTION SWITCH
function showSection(event, sectionId) {
    document.querySelectorAll(".section").forEach(sec => {
        sec.classList.remove("active-section");
    });

    document.querySelectorAll(".nav-links a").forEach(link => {
        link.classList.remove("active");
    });

    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.add("active-section");
    }

    if (event && event.currentTarget) {
        event.currentTarget.classList.add("active");
    }
}

// BOOKING MODAL
async function submitBooking() {
    const roomName = document.getElementById("modalRoomName")?.value.trim();
    const date = document.getElementById("modalDate")?.value;
    const day = document.getElementById("modalDay")?.value.trim();
    const startTime = document.getElementById("modalStartTime")?.value;
    const endTime = document.getElementById("modalEndTime")?.value;
    const userEmail = localStorage.getItem("userEmail");
    const userRole = localStorage.getItem("userRole");

    if (!roomName || !date || !day || !startTime || !endTime || !userEmail || !userRole) {
        alert("Please fill all booking details");
        return;
    }

    if (startTime >= endTime) {
        alert("End time must be after start time");
        return;
    }

    const now = new Date();
    const selectedStart = new Date(`${date}T${startTime}`);
    const today = new Date().toISOString().split("T")[0];

    if (date === today && selectedStart <= now) {
        alert("Booking must start in the future");
        return;
    }

    try {
        const response = await fetch("/api/book-room", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                roomName,
                userEmail,
                userRole,
                date,
                day,
                startTime,
                endTime
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            closeBookingModal();
            await loadBookings(date);
            await loadMyBookings();
            await loadDashboardStats();
            await loadNotifications();
            await loadApprovals();
        } else {
            alert(data.message);
        }

    } catch (err) {
        console.log("SUBMIT BOOKING ERROR:", err);
        alert("Server error");
    }
}

function closeBookingModal() {
    const modal = document.getElementById("bookingModal");
    if (modal) {
        modal.classList.add("hidden");
    }
    currentBookingButton = null;
    loadBookings();
}

document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "modalDate") {
        const selectedDate = e.target.value;
        if (selectedDate) {
            const dateObj = new Date(selectedDate);
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
            const modalDay = document.getElementById("modalDay");
            if (modalDay) {
                modalDay.value = dayName;
            }
        }
    }
});

async function loadBookings(selectedDate = null) {
    try {
        let dateToUse = selectedDate;

        if (!dateToUse) {
            const modalDateInput = document.getElementById("modalDate");
            dateToUse = modalDateInput && modalDateInput.value
                ? modalDateInput.value
                : new Date().toISOString().split("T")[0];
        }

        const response = await fetch(`/api/today-room-status?date=${dateToUse}`);
        const data = await response.json();

        if (!data.success) {
            console.log("Failed to load room status");
            return;
        }

        const cards = document.querySelectorAll(".room-card");
        const now = new Date();
        const today = new Date().toISOString().split("T")[0];
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        cards.forEach(card => {
            const roomName = card.getAttribute("data-room")?.trim().toLowerCase();
            const badge = card.querySelector(".status-badge");
            const button = card.querySelector(".room-btn");
            const liveStatus = card.querySelector(".live-status");
            const nextSlot = card.querySelector(".next-slot");
            const usagePercent = card.querySelector(".usage-percent");
            const usageFill = card.querySelector(".usage-fill");

            if (!roomName) return;

            const roomBookings = (data.bookings || [])
                .filter(b => (b.roomName || "").trim().toLowerCase() === roomName)
                .map(b => {
                    const [startHour, startMin] = b.startTime.split(":").map(Number);
                    const [endHour, endMin] = b.endTime.split(":").map(Number);

                    return {
                        ...b,
                        startTotal: startHour * 60 + startMin,
                        endTotal: endHour * 60 + endMin
                    };
                })
                .sort((a, b) => a.startTotal - b.startTotal);

            let isOccupied = false;
            let nextBooking = null;
            let totalBookedMinutes = 0;

            roomBookings.forEach(booking => {
                totalBookedMinutes += (booking.endTotal - booking.startTotal);

                if (dateToUse === today && currentMinutes >= booking.startTotal && currentMinutes < booking.endTotal) {
                    isOccupied = true;
                }
            });

            if (dateToUse === today) {
                nextBooking = roomBookings.find(booking => booking.endTotal > currentMinutes) || null;
            } else {
                nextBooking = roomBookings[0] || null;
            }

            const usage = Math.min((totalBookedMinutes / (12 * 60)) * 100, 100);

            if (usagePercent) usagePercent.innerText = `${Math.round(usage)}%`;
            if (usageFill) usageFill.style.width = `${usage}%`;

            if (dateToUse !== today) {
                if (badge) {
                    badge.innerText = roomBookings.length > 0 ? "Partially Booked" : "Available";
                    badge.classList.remove("occupied", "maintenance");
                    badge.classList.add("available");
                }

                if (liveStatus) {
                    liveStatus.innerText = roomBookings.length > 0 ? "Check selected date" : "Available on selected date";
                    liveStatus.classList.remove("occupied-now");
                    liveStatus.classList.add("available-now");
                }

                if (nextSlot) {
                    nextSlot.innerText = nextBooking
                        ? `${formatTimeTo12Hour(nextBooking.startTime)} - ${formatTimeTo12Hour(nextBooking.endTime)}`
                        : "No booking for selected date";
                }

                return;
            }

            if (isOccupied) {
                if (badge) {
                    badge.innerText = "Occupied";
                    badge.classList.remove("available", "maintenance");
                    badge.classList.add("occupied");
                }

                if (liveStatus) {
                    liveStatus.innerText = "Occupied now";
                    liveStatus.classList.remove("available-now");
                    liveStatus.classList.add("occupied-now");
                }
            } else {
                if (badge) {
                    badge.innerText = roomBookings.length > 0 ? "Booked Later" : "Available";
                    badge.classList.remove("occupied", "maintenance");
                    badge.classList.add("available");
                }

                if (liveStatus) {
                    liveStatus.innerText = "Available now";
                    liveStatus.classList.remove("occupied-now");
                    liveStatus.classList.add("available-now");
                }
            }

            if (nextSlot) {
                nextSlot.innerText = nextBooking
                    ? `${formatTimeTo12Hour(nextBooking.startTime)} - ${formatTimeTo12Hour(nextBooking.endTime)}`
                    : "No upcoming booking";
            }
        });

    } catch (err) {
        console.log("LOAD BOOKINGS ERROR:", err);
    }
}
function parseBookingDateTime(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}`);
}

function isBookingExpired(dateStr, endTime) {
    const bookingEnd = parseBookingDateTime(dateStr, endTime);
    const now = new Date();
    return bookingEnd < now;
}

// MY BOOKINGS
async function loadMyBookings() {
    const userEmail = localStorage.getItem("userEmail");
    const tableBody = document.getElementById("myBookingsTableBody");

    if (!tableBody || !userEmail) return;

    try {
        const response = await fetch(`/api/my-bookings/${userEmail}`);
        const data = await response.json();

        tableBody.innerHTML = "";

        if (!data.success || !data.bookings || data.bookings.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6">No active bookings found</td></tr>`;
            return;
        }

        const activeBookings = data.bookings.filter(booking => !isBookingExpired(booking.date, booking.endTime));

        if (activeBookings.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6">No active bookings found</td></tr>`;
            return;
        }

        activeBookings.forEach(booking => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${booking.roomName}</td>
                <td>${booking.date}</td>
                <td>${booking.day || "-"}</td>
                <td>${booking.startTime}</td>
                <td>${booking.endTime}</td>
                <td>
                    <button class="room-btn" style="background:#dc2626;color:white;" onclick="cancelBooking('${booking._id}')">
                        Cancel
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });

    } catch (err) {
        console.log("LOAD MY BOOKINGS ERROR:", err);
    }
}

async function cancelBooking(bookingId) {
    const ok = confirm("Are you sure you want to cancel this booking?");
    if (!ok) return;

    try {
        const response = await fetch(`/api/cancel-booking/${bookingId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        await loadMyBookings();
        await loadBookings();
        await loadDashboardStats();
        await loadNotifications();

        alert("Booking cancelled successfully");
    } catch (err) {
        console.log("CANCEL BOOKING FRONTEND ERROR:", err);
        alert("Server error");
    }
}

function renderEquipmentAction(actionBox, status, itemName, approvalId = null) {
    if (!actionBox) return;

    const safeItem = itemName.replace(/'/g, "\\'");

    if (status === "Request") {
        actionBox.innerHTML = `
            <button class="room-btn btn-blue" onclick="requestEquipment('${safeItem}')">Request</button>
        `;
    } else if (status === "Requested") {
        actionBox.innerHTML = `
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="room-btn" style="background:#facc15; color:black;" disabled>Requested</button>
                <button class="room-btn" style="background:#dc2626; color:white;" onclick="cancelEquipmentApproval('${approvalId}', '${safeItem}')">Cancel</button>
            </div>
        `;
    } else if (status === "Approved") {
        actionBox.innerHTML = `
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="room-btn" style="background:#16a34a; color:white;" disabled>Approved</button>
                <button class="room-btn" style="background:#0ea5e9; color:white;" onclick="markEquipmentUsageComplete('${safeItem}')">Usage Complete</button>
            </div>
        `;
    } else if (status === "Rejected") {
        actionBox.innerHTML = `
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="room-btn" style="background:#dc2626; color:white;" disabled>Rejected</button>
                <button class="room-btn btn-blue" onclick="requestAgainEquipment('${safeItem}')">ReRequest</button>
            </div>
        `;
    }
}

async function requestEquipment(itemName) {
    const userEmail = localStorage.getItem("userEmail");
    const userRole = localStorage.getItem("userRole");

    try {
        const response = await fetch("/api/request-equipment", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                itemName,
                userEmail,
                userRole
            })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        await loadEquipmentRequests();
        await loadDashboardStats();
        await loadNotifications();
        await loadApprovals();

        alert(data.message);
    } catch (err) {
        console.log("REQUEST EQUIPMENT ERROR:", err);
        alert("Server error");
    }
}

async function requestAgainEquipment(itemName) {
    const ok = confirm(`Request ${itemName} again?`);
    if (!ok) return;

    const userEmail = localStorage.getItem("userEmail");

    try {
        const approvalRes = await fetch(`/api/my-equipment-approvals/${userEmail}`);
        const approvalData = await approvalRes.json();

        const myRejectedApproval = (approvalData.approvals || [])
            .filter(a => a.resourceName === itemName && a.status === "Rejected")
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

        if (myRejectedApproval) {
            await fetch(`/api/delete-equipment-approval/${myRejectedApproval._id}`, {
                method: "DELETE"
            });
        }

        document.querySelectorAll(".equipment-table tbody tr").forEach(row => {
            const currentItem = row.children[0]?.innerText.trim();
            const actionBox = row.querySelector(".equipment-action-box");

            if (currentItem === itemName && actionBox) {
                renderEquipmentAction(actionBox, "Request", itemName);
            }
        });

        await loadEquipmentRequests();
        await loadDashboardStats();
        await loadNotifications();

    } catch (err) {
        console.log("REREQUEST EQUIPMENT ERROR:", err);
        alert("Server error");
    }
}

async function loadEquipmentRequests() {
    try {
        const userEmail = localStorage.getItem("userEmail");
        if (!userEmail) return;

        const [requestRes, approvalRes] = await Promise.all([
            fetch("/api/equipment-requests"),
            fetch(`/api/my-equipment-approvals/${userEmail}`)
        ]);

        const requestData = await requestRes.json();
        const approvalData = await approvalRes.json();

        const approvedRequests = requestData.requests || [];
        const myApprovals = approvalData.approvals || [];

        document.querySelectorAll(".equipment-table tbody tr").forEach(row => {
            const itemName = row.children[0]?.innerText.trim();
            const actionBox = row.querySelector(".equipment-action-box");
            if (!itemName || !actionBox) return;

            const myApproved = approvedRequests.find(
                r => r.itemName === itemName && r.userEmail === userEmail && r.status === "Approved"
            );

            const myLatestApproval = myApprovals
                .filter(a => a.resourceName === itemName)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

            if (myApproved) {
                renderEquipmentAction(actionBox, "Approved", itemName);
            } else if (myLatestApproval?.status === "Pending") {
                renderEquipmentAction(actionBox, "Requested", itemName, myLatestApproval._id);
            } else if (myLatestApproval?.status === "Rejected") {
                renderEquipmentAction(actionBox, "Rejected", itemName, myLatestApproval._id);
            } else {
                renderEquipmentAction(actionBox, "Request", itemName);
            }
        });
    } catch (err) {
        console.log("LOAD EQUIPMENT REQUESTS ERROR:", err);
    }
}

async function cancelEquipmentApproval(approvalId, itemName) {
    const ok = confirm(`Cancel request for ${itemName}?`);
    if (!ok) return;

    try {
        const response = await fetch(`/api/cancel-equipment-approval/${approvalId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        document.querySelectorAll(".equipment-table tbody tr").forEach(row => {
            const currentItem = row.children[0]?.innerText.trim();
            const actionBox = row.querySelector(".equipment-action-box");

            if (currentItem === itemName && actionBox) {
                renderEquipmentAction(actionBox, "Request", itemName);
            }
        });

        await loadEquipmentRequests();
        await loadDashboardStats();
        await loadNotifications();

        alert("Request cancelled");
    } catch (err) {
        console.log("CANCEL EQUIPMENT APPROVAL ERROR:", err);
        alert("Server error");
    }
}

async function markEquipmentUsageComplete(itemName) {
    const userEmail = localStorage.getItem("userEmail");
    const ok = confirm(`Mark usage completed for ${itemName}?`);
    if (!ok) return;

    try {
        let exactItemName = itemName;

        document.querySelectorAll(".equipment-table tbody tr").forEach(row => {
            const actionBox = row.querySelector(".equipment-action-box");
            const currentItem = row.children[0]?.innerText.trim();

            if (actionBox && actionBox.innerHTML.includes("Usage Complete") && currentItem.includes("MacBook Pro")) {
                if (itemName.includes("MacBook Pro")) {
                    exactItemName = currentItem;
                }
            }
        });

        const response = await fetch("/api/equipment-usage-complete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                itemName: exactItemName.trim(),
                userEmail: userEmail.trim()
            })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        await loadEquipmentRequests();
        await loadDashboardStats();
        await loadNotifications();

        alert("Usage completed");
    } catch (err) {
        console.log("USAGE COMPLETE ERROR:", err);
        alert("Server error");
    }
}

// EQUIPMENT TABLE STATUS
async function loadMyEquipmentRequests() {
    const userEmail = localStorage.getItem("userEmail");
    const tableBody = document.getElementById("myRequestsTableBody");

    if (!tableBody || !userEmail) return;

    try {
        const [requestRes, approvalRes] = await Promise.all([
            fetch("/api/equipment-requests"),
            fetch(`/api/my-equipment-approvals/${userEmail}`)
        ]);

        const requestData = await requestRes.json();
        const approvalData = await approvalRes.json();

        tableBody.innerHTML = "";

        const approvedRequests = (requestData.requests || [])
            .filter(req => req.userEmail === userEmail)
            .map(req => ({
                itemName: req.itemName,
                status: "Approved",
                date: req.date || req.createdAt
            }));

        const approvalRequests = (approvalData.approvals || []).map(app => ({
            itemName: app.resourceName,
            status: app.status === "Pending" ? "Requested" : app.status,
            date: app.date || app.createdAt
        }));

        const merged = [...approvalRequests, ...approvedRequests];
        const uniqueMap = new Map();

        merged.forEach(item => {
            const existing = uniqueMap.get(item.itemName);

            const priority = {
                "Approved": 3,
                "Requested": 2,
                "Rejected": 1
            };

            if (!existing || (priority[item.status] || 0) >= (priority[existing.status] || 0)) {
                uniqueMap.set(item.itemName, item);
            }
        });

        const finalRequests = Array.from(uniqueMap.values()).sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        if (finalRequests.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3">No equipment requests found</td></tr>`;
            return;
        }

        finalRequests.forEach(req => {
            let color = "#2563eb";
            if (req.status === "Requested") color = "#eab308";
            if (req.status === "Approved") color = "#16a34a";
            if (req.status === "Rejected") color = "#dc2626";

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${req.itemName}</td>
                <td><span style="font-weight:600;color:${color};">${req.status}</span></td>
                <td>${new Date(req.date).toLocaleDateString()}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (err) {
        console.log("LOAD MY REQUESTS ERROR:", err);
    }
}

async function loadDashboardStats() {
    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) return;

    try {
        const response = await fetch(`/api/dashboard-stats/${userEmail}`);
        const data = await response.json();

        if (!data.success) return;

        const totalBookingsCount = document.getElementById("totalBookingsCount");
        const myBookingsCount = document.getElementById("myBookingsCount");
        const totalEquipmentRequestsCount = document.getElementById("totalEquipmentRequestsCount");
        const myEquipmentRequestsCount = document.getElementById("myEquipmentRequestsCount");
        const role = localStorage.getItem("userRole");
const myPendingApprovalsCount = document.getElementById("myPendingApprovalsCount");

        if (totalBookingsCount) totalBookingsCount.innerText = data.totalBookings ?? 0;
        if (myBookingsCount) myBookingsCount.innerText = data.myBookings ?? 0;
        if (totalEquipmentRequestsCount) totalEquipmentRequestsCount.innerText = data.totalEquipmentRequests ?? 0;
        if (myEquipmentRequestsCount) myEquipmentRequestsCount.innerText = data.myEquipmentRequests ?? 0;
        if (role !== "Student" && myPendingApprovalsCount) {
    myPendingApprovalsCount.innerText = data.myPendingApprovals ?? 0;
}

    } catch (err) {
        console.log("LOAD DASHBOARD STATS ERROR:", err);
    }
}

// MAINTENANCE
function enableMaintenance() {
    localStorage.setItem("maintenanceMode", "true");

    const cards = document.querySelectorAll(".room-card");

    cards.forEach(card => {
        const badge = card.querySelector(".status-badge");
        const button = card.querySelector(".room-btn");

        if (badge) {
            badge.innerText = "Maintenance";
            badge.classList.remove("available", "occupied");
            badge.classList.add("maintenance");
        }

        if (button) {
            button.innerText = "Under Maintenance";
            button.disabled = true;
        }
    });
}

function disableMaintenance() {
    localStorage.setItem("maintenanceMode", "false");
    loadBookings();

    const cards = document.querySelectorAll(".room-card");

    cards.forEach(card => {
        const button = card.querySelector(".room-btn");
        if (button && button.innerText === "Under Maintenance") {
            button.innerText = "Book Now";
            button.disabled = false;
        }
    });
}

const maintenance = localStorage.getItem("maintenanceMode");
if (maintenance === "true") {
    enableMaintenance();
}

// SEARCH
function enableRoomSearch() {
    const searchInput = document.getElementById("roomSearch");
    const roomsGrid = document.querySelector(".rooms-grid");

    if (!searchInput || !roomsGrid) return;

    searchInput.addEventListener("keyup", function () {
        const searchText = searchInput.value.toLowerCase().trim();
        const roomCards = Array.from(roomsGrid.querySelectorAll(".room-card"));

        const matchedCards = [];
        const unmatchedCards = [];

        roomCards.forEach(card => {
            const roomTitle = card.querySelector(".room-title")?.innerText.toLowerCase() || "";
            if (roomTitle.includes(searchText)) {
                matchedCards.push(card);
            } else {
                unmatchedCards.push(card);
            }
        });

        roomsGrid.innerHTML = "";
        matchedCards.forEach(card => roomsGrid.appendChild(card));
        unmatchedCards.forEach(card => roomsGrid.appendChild(card));
    });
}

function enableEquipmentSearch() {
    const searchInput = document.getElementById("equipmentSearch");
    const table = document.querySelector(".equipment-table");

    if (!searchInput || !table) return;

    const tbody = table.querySelector("tbody") || table;

    searchInput.addEventListener("keyup", function () {
        const searchText = searchInput.value.toLowerCase().trim();
        const rows = Array.from(tbody.querySelectorAll("tr")).filter(row => row.querySelectorAll("td").length > 0);

        const matchedRows = [];
        const unmatchedRows = [];

        rows.forEach(row => {
            const itemName = row.children[0]?.innerText.toLowerCase() || "";

            if (searchText === "" || itemName.includes(searchText)) {
                matchedRows.push(row);
            } else {
                unmatchedRows.push(row);
            }
        });

        rows.forEach(row => row.remove());
        matchedRows.forEach(row => tbody.appendChild(row));
        unmatchedRows.forEach(row => tbody.appendChild(row));
    });
}

function formatTimeTo12Hour(time24) {
    if (!time24) return "";
    let [hours, minutes] = time24.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

async function loadNotifications() {
    const userEmail = localStorage.getItem("userEmail");
    const container = document.getElementById("notificationList");

    if (!userEmail || !container) return;

    try {
        const response = await fetch(`/api/notifications/${userEmail}`);
        const data = await response.json();

        if (!data.success || data.notifications.length === 0) {
            container.innerHTML = `<div class="notification-card"><div class="notification-message">No notifications yet.</div></div>`;
            return;
        }

        container.innerHTML = data.notifications.map(n => `
            <div class="notification-card">
                <div class="notification-title">${n.title}</div>
                <div class="notification-message">${n.message}</div>
                <div class="notification-date">${new Date(n.createdAt).toLocaleString()}</div>
            </div>
        `).join("");
    } catch (err) {
        console.log("LOAD NOTIFICATIONS ERROR:", err);
    }
}

async function loadApprovals() {
    const userRole = localStorage.getItem("userRole");
    const container = document.getElementById("approvalList");

    if (!userRole || !container) return;

    if (userRole === "Student") {
        container.innerHTML = `<div class="approval-card"><div class="approval-message">Students cannot approve requests.</div></div>`;
        return;
    }

    try {
        const response = await fetch(`/api/approvals/${encodeURIComponent(userRole)}`);
        const data = await response.json();

        if (!data.success || data.approvals.length === 0) {
            container.innerHTML = `<div class="approval-card"><div class="approval-message">No pending approvals.</div></div>`;
            return;
        }

        container.innerHTML = data.approvals.map(a => `
            <div class="approval-card">
                <div class="approval-title">${a.resourceType} Request - ${a.resourceName}</div>
                <div class="approval-message">
                    Requested by: <strong>${a.requestedBy}</strong><br>
                    Role: <strong>${a.requesterRole}</strong><br>
                    ${a.date ? `Date: <strong>${a.date}</strong><br>` : ""}
                    ${a.startTime ? `Time: <strong>${a.startTime} - ${a.endTime}</strong><br>` : ""}
                    Status: <strong>${a.status}</strong>
                </div>
                <div class="approval-date">${new Date(a.createdAt).toLocaleString()}</div>
                <div class="approval-actions">
                    <button class="approve-btn" onclick="approveRequest('${a._id}')">Approve</button>
                    <button class="reject-btn" onclick="rejectRequest('${a._id}')">Reject</button>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.log("LOAD APPROVALS ERROR:", err);
    }
}

async function approveRequest(id) {
    try {
        const response = await fetch(`/api/approve/${id}`, {
            method: "POST"
        });

        const data = await response.json();
        alert(data.message);

        if (data.success) {
            loadApprovals();
            loadNotifications();
            loadDashboardStats();
            loadBookings();
            loadMyBookings();
            loadEquipmentRequests();
            loadMyEquipmentRequests();
        }
    } catch (err) {
        console.log("APPROVE REQUEST ERROR:", err);
    }
}

async function rejectRequest(id) {
    const remarks = prompt("Enter rejection reason (optional):") || "";

    try {
        const response = await fetch(`/api/reject/${id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ remarks })
        });

        const data = await response.json();
        alert(data.message);

        if (data.success) {
            loadApprovals();
            loadNotifications();
            loadDashboardStats();
        }
    } catch (err) {
        console.log("REJECT REQUEST ERROR:", err);
    }
}

function applyRoleAccess() {
    const role = localStorage.getItem("userRole");

    const approvalNav = document.getElementById("approvalNav");
    const pendingApprovalsCard = document.getElementById("pendingApprovalsCard");
    const setMaintenanceBtn = document.getElementById("setMaintenanceBtn");
    const finishMaintenanceBtn = document.getElementById("finishMaintenanceBtn");

    if (role === "Student") {
        if (approvalNav) approvalNav.style.display = "none";
        if (pendingApprovalsCard) pendingApprovalsCard.style.display = "none";
        if (setMaintenanceBtn) setMaintenanceBtn.style.display = "none";
        if (finishMaintenanceBtn) finishMaintenanceBtn.style.display = "none";
    } else if (role === "Faculty/Staff") {
        if (approvalNav) approvalNav.style.display = "block";
        if (pendingApprovalsCard) pendingApprovalsCard.style.display = "block";
        if (setMaintenanceBtn) setMaintenanceBtn.style.display = "none";
        if (finishMaintenanceBtn) finishMaintenanceBtn.style.display = "none";
    } else if (role === "Administrator") {
        if (approvalNav) approvalNav.style.display = "block";
        if (pendingApprovalsCard) pendingApprovalsCard.style.display = "block";
        if (setMaintenanceBtn) setMaintenanceBtn.style.display = "inline-block";
        if (finishMaintenanceBtn) finishMaintenanceBtn.style.display = "inline-block";
    }
}

function openBookingModal(roomName, button) {
    const modal = document.getElementById("bookingModal");
    const roomInput = document.getElementById("modalRoomName");
    const dateInput = document.getElementById("modalDate");
    const dayInput = document.getElementById("modalDay");

    if (!modal || !roomInput) {
        alert("Booking modal not found");
        return;
    }

    currentBookingButton = button || null;
    roomInput.value = roomName;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    if (dateInput) {
        dateInput.value = formattedDate;
    }

    if (dayInput) {
        dayInput.value = today.toLocaleDateString("en-US", { weekday: "long" });
    }

    modal.classList.remove("hidden");
}

window.onload = function () {
    const path = window.location.pathname.toLowerCase();

    if (path.endsWith("/") || path.includes("login.html")) {
        return;
    }

    if (path.includes("dashboard.html")) {
        loadProfile();
        loadBookings();
        loadMyBookings();
        loadEquipmentRequests();
        loadMyEquipmentRequests();
        loadDashboardStats();
        enableRoomSearch();
        enableEquipmentSearch();
        applyRoleAccess();
        loadNotifications();
        loadApprovals();

        setInterval(() => {
            loadBookings();
            loadMyBookings();
            loadDashboardStats();
        }, 60000);
    }
};
