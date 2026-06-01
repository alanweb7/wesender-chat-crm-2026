import { Router } from "express";
import multer from "multer";
import os from "os";
import isAuth from "../middleware/isAuth";
import * as KnowledgeBaseController from "../controllers/KnowledgeBaseController";

const upload = multer({ dest: os.tmpdir() });
const knowledgeBaseRoutes = Router();

knowledgeBaseRoutes.get("/knowledge-bases", isAuth, KnowledgeBaseController.index);
knowledgeBaseRoutes.get("/knowledge-bases/:id", isAuth, KnowledgeBaseController.show);
knowledgeBaseRoutes.post("/knowledge-bases", isAuth, KnowledgeBaseController.store);
knowledgeBaseRoutes.put("/knowledge-bases/:id", isAuth, KnowledgeBaseController.update);
knowledgeBaseRoutes.delete("/knowledge-bases/:id", isAuth, KnowledgeBaseController.remove);

knowledgeBaseRoutes.post("/knowledge-bases/:id/items", isAuth, upload.single("file"), KnowledgeBaseController.addItem);
knowledgeBaseRoutes.delete("/knowledge-bases/:id/items/:itemId", isAuth, KnowledgeBaseController.removeItem);

export default knowledgeBaseRoutes;
