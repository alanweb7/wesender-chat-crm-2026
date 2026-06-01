import express from "express";
import * as HostiNotasController from "../controllers/HostiNotasController";
import isAuth from "../middleware/isAuth";

const hostiNotasRoutes = express.Router();

hostiNotasRoutes.get("/hosti-notas/config", isAuth, HostiNotasController.getConfig);
hostiNotasRoutes.post("/hosti-notas/config", isAuth, HostiNotasController.saveConfig);

export default hostiNotasRoutes;
