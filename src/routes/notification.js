const express = require("express");
const { getNotifications } = require("../controllers/notification");
const { verifyUser } = require("../middlewares/auth");

const router = express.Router();

router.get("/", verifyUser, getNotifications);

module.exports = router;