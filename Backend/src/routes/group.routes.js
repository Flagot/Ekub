import { Router } from "express";
import {
  createGroup,
  getGroupById,
  listMyGroups,
} from "../controllers/group.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const groupRouter = Router();

groupRouter.use(requireAuth);
groupRouter.post("/", createGroup);
groupRouter.get("/mine", listMyGroups);
groupRouter.get("/:groupId", getGroupById);

export default groupRouter;
