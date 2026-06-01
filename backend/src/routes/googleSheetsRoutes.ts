import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { authenticate, authCallback, getAuthStatus, testConnection, executeOperation } from "../controllers/GoogleSheetsController";

const router = Router();

// Autenticação
router.post("/auth", isAuth, authenticate);
router.get("/auth/callback", authCallback); // callback do OAuth — Google redireciona aqui, sem JWT
router.get("/auth-status", isAuth, getAuthStatus);

// Teste e operações
router.post("/test", isAuth, testConnection);
router.post("/execute", isAuth, executeOperation);

export default router;
