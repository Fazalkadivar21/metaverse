import { Router } from "express";
import {getBulkMeta, logout, login, register, updateMetadata} from "../controllers/user.controller";
import { authenticateUser } from "../middlewares/userAuth.middleware";

export const userRouter: Router = Router();

userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/logout", logout);
userRouter.post("/metadata", authenticateUser, updateMetadata);
userRouter.get("/metadata/bulk", getBulkMeta);