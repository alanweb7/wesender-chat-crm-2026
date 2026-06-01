import { Router } from "express";
import multer from "multer";
import path from "path";
import isAuth from "../middleware/isAuth";
import * as CompanyDocumentController from "../controllers/CompanyDocumentController";

const router = Router();

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "..", "..", "public", "company-documents");
    
    // Criar diretório se não existir
    const fs = require('fs');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para evitar conflitos
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas tipos de arquivo comuns
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Rotas
router.get("/", isAuth, CompanyDocumentController.index);
router.post("/", isAuth, upload.single('file'), CompanyDocumentController.store);
router.get("/:id", isAuth, CompanyDocumentController.show);
router.put("/:id", isAuth, CompanyDocumentController.update);
router.delete("/:id", isAuth, CompanyDocumentController.remove);
router.get("/:id/download", isAuth, CompanyDocumentController.download);

export default router;
