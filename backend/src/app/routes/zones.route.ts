import express from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { adjustZone, createZone, deleteZone, getZones, updateZone } from "../controllers/zones.controller.js";

const router = express.Router();

router.get("/", requireAuth, getZones);
router.post("/", requireAuth, createZone);
router.put("/:zoneId", requireAuth, updateZone);
router.post("/adjust", requireAuth, adjustZone);
router.delete("/:zoneId", requireAuth, deleteZone);

export default router;
