import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as WhatsappWidgetController from "../controllers/WhatsappWidgetController";

const whatsappWidgetRoutes = Router();

// Rotas autenticadas — CRUD de widgets
whatsappWidgetRoutes.get("/whatsapp-widget", isAuth, WhatsappWidgetController.index);
whatsappWidgetRoutes.post("/whatsapp-widget", isAuth, WhatsappWidgetController.store);
whatsappWidgetRoutes.delete("/whatsapp-widget/:widgetId", isAuth, WhatsappWidgetController.remove);

export default whatsappWidgetRoutes;
