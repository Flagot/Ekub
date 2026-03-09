import { Router } from "express";
import { createGroup, listMyGroups } from "../controllers/group.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const groupRouter = Router();

groupRouter.use(requireAuth);
groupRouter.post("/", createGroup);
groupRouter.get("/mine", listMyGroups);

export default groupRouter;
