import { getAvatars } from "../controllers/avatar.controller";
import { Router } from "express";

const avatarRouter: Router = Router();

avatarRouter.get("/", getAvatars);

export default avatarRouter;
