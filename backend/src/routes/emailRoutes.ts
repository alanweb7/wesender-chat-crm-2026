import express from "express";
import { sendCrmEmail } from "../controllers/EmailController";
import isAuth from "../middleware/isAuth";

const emailRoutes = express.Router();

emailRoutes.post("/send-crm-email", isAuth, sendCrmEmail);

export default emailRoutes;
