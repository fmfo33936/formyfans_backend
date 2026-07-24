const express = require("express");
const router = express.Router();

const {
  createAdmin,
  loginAdmin,
  getAllUsers,
  toggleUserActivity,
  getDashboard,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
} = require("../controllers/admin");
const { getAllOrders } = require("../controllers/order");
const { verifyAdmin } = require("../middlewares/admin");

router.post("/create", createAdmin);
router.post("/login", loginAdmin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.put("/change-password", verifyAdmin, changePassword);
router.get("/users", verifyAdmin, getAllUsers);
router.patch("/users/:userId/toggle-activity", verifyAdmin, toggleUserActivity);
router.get("/dashboard", verifyAdmin, getDashboard);
router.get("/orders", verifyAdmin, getAllOrders);

module.exports = router;
