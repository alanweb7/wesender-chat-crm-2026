import { Router } from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";
import * as VerssionController from "../controllers/VersionController";

const versionRouter = Router();

versionRouter.get("/version", isAuth, VerssionController.index);
versionRouter.post("/version", isAuth, isSuper, VerssionController.store);

export default versionRouter;
