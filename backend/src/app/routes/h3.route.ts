import express from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import { generateH3Grid } from "../controllers/h3.controller.js";

const router = express.Router();

router.post("/generate", requireAuth, generateH3Grid);

export default router;
