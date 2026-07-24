const express = require("express");
const router = express.Router();
const {
  createCampaign,
  confirmCampaignPayment,
  retryCampaignPayment,
  getCampaigns,
  getCampaignById,
  deleteCampaign,
  updateCampaign,
} = require("../controllers/campaign");
const { verifyUser } = require("../middlewares/auth");

router.post("/", verifyUser, createCampaign);
router.post("/confirm-payment", verifyUser, confirmCampaignPayment);
router.post("/retry-payment", verifyUser, retryCampaignPayment);
router.get("/", verifyUser, getCampaigns);
router.put("/:id", verifyUser, updateCampaign);
router.get("/:id", verifyUser, getCampaignById);
router.delete("/:id", verifyUser, deleteCampaign);

module.exports = router;
