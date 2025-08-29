import { Router } from "express";
import {createSpace,deleteSpace,getSpaces,getSpace,addElement,deleteElement,getElements} from "../controllers/space.controller";
import { authenticateUser } from "../middlewares/userAuth.middleware";

const spaceRouter: Router = Router();

spaceRouter.use(authenticateUser);

spaceRouter.post("/", createSpace);
spaceRouter.delete("/:spaceId", deleteSpace);
spaceRouter.get("/", getSpaces);
spaceRouter.get("/:spaceId", getSpace);
spaceRouter.post("/element", addElement);
spaceRouter.delete("/element", deleteElement);
spaceRouter.get("/element", getElements);

export default spaceRouter;
