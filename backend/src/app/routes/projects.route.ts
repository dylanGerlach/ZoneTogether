import express from "express";

import {
  assignProjectHexes,
  createProject,
  createProjectTeam,
  deleteProject,
  deleteProjectTeam,
  ensureProjectChat,
  geocodeCity,
  getProjectMap,
  getProjectTeamMembers,
  listProjectTeams,
  listProjects,
  setProjectTeamMembers,
  unassignProjectHexes,
  updateProject,
  updateProjectTeam,
} from "../controllers/projects.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, listProjects);
router.post("/", requireAuth, createProject);
router.get("/geocode", requireAuth, geocodeCity);
router.get("/:projectId/map", requireAuth, getProjectMap);
router.patch("/:projectId", requireAuth, updateProject);
router.delete("/:projectId", requireAuth, deleteProject);

router.get("/:projectId/teams", requireAuth, listProjectTeams);
router.post("/:projectId/teams", requireAuth, createProjectTeam);
router.patch("/:projectId/teams/:teamId", requireAuth, updateProjectTeam);
router.delete("/:projectId/teams/:teamId", requireAuth, deleteProjectTeam);

router.get("/:projectId/members", requireAuth, getProjectTeamMembers);
router.put("/:projectId/teams/:teamId/members", requireAuth, setProjectTeamMembers);

router.post("/:projectId/map/assign", requireAuth, assignProjectHexes);
router.post("/:projectId/map/unassign", requireAuth, unassignProjectHexes);

router.get("/:projectId/chat", requireAuth, ensureProjectChat);

export default router;
