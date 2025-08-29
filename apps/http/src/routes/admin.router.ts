import { Router } from "express";
import {
  createElement,
  updateElement,
  createAvatar,
  createMap,
} from "../controllers/admin.controller";
import { authenticateAdmin } from "../middlewares/adminAuth.middleware";

const adminRouter: Router = Router();

adminRouter.use(authenticateAdmin);

adminRouter.post("/element", createElement);
adminRouter.put("/element/:elementId", updateElement);
adminRouter.post("/avatar", createAvatar);
adminRouter.post("/map", createMap);

export default adminRouter;
