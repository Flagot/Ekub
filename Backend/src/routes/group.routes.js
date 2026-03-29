import { Router } from "express";
import {
  createGroup,
  getDashboard,
  getGroupById,
  listMyGroups,
  requestJoinGroup,
} from "../controllers/group.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const groupRouter = Router();

groupRouter.use(requireAuth);
groupRouter.post("/", createGroup);
groupRouter.get("/dashboard", getDashboard);
groupRouter.get("/mine", listMyGroups);
groupRouter.post("/:groupId/join", requestJoinGroup);
groupRouter.get("/:groupId", getGroupById);

export default groupRouter;
