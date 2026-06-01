import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as ProdutoController from "../controllers/ProdutoController";
import * as ProdutoCategoriaController from "../controllers/ProdutoCategoriaController";
import * as ProdutoVariacaoController from "../controllers/ProdutoVariacaoController";
import * as ProdutoMarcaController from "../controllers/ProdutoMarcaController";
import * as ProdutoCustomFieldController from "../controllers/ProdutoCustomFieldController";

const produtoRoutes = express.Router();
const upload = multer(uploadConfig);

produtoRoutes.get("/produtos", isAuth, ProdutoController.index);
produtoRoutes.post("/produtos", isAuth, ProdutoController.store);
produtoRoutes.get("/produtos/:produtoId", isAuth, ProdutoController.show);
produtoRoutes.put("/produtos/:produtoId", isAuth, ProdutoController.update);
produtoRoutes.delete("/produtos/:produtoId", isAuth, ProdutoController.remove);

produtoRoutes.post(
  "/produtos/upload-imagem",
  isAuth,
  upload.single("file"),
  ProdutoController.uploadImagem
);

produtoRoutes.get("/produto-categorias", isAuth, ProdutoCategoriaController.index);
produtoRoutes.post("/produto-categorias", isAuth, ProdutoCategoriaController.store);
produtoRoutes.get(
  "/produto-categorias/:categoriaId",
  isAuth,
  ProdutoCategoriaController.show
);
produtoRoutes.put(
  "/produto-categorias/:categoriaId",
  isAuth,
  ProdutoCategoriaController.update
);
produtoRoutes.delete(
  "/produto-categorias/:categoriaId",
  isAuth,
  ProdutoCategoriaController.remove
);

produtoRoutes.get("/produto-variacoes", isAuth, ProdutoVariacaoController.listGrupos);
produtoRoutes.post("/produto-variacoes/grupos", isAuth, ProdutoVariacaoController.createGrupo);
produtoRoutes.put("/produto-variacoes/grupos/:grupoId", isAuth, ProdutoVariacaoController.updateGrupo);
produtoRoutes.delete(
  "/produto-variacoes/grupos/:grupoId",
  isAuth,
  ProdutoVariacaoController.deleteGrupo
);

produtoRoutes.post("/produto-variacoes/opcoes", isAuth, ProdutoVariacaoController.createOpcao);
produtoRoutes.put("/produto-variacoes/opcoes/:opcaoId", isAuth, ProdutoVariacaoController.updateOpcao);
produtoRoutes.delete(
  "/produto-variacoes/opcoes/:opcaoId",
  isAuth,
  ProdutoVariacaoController.deleteOpcao
);

// Rotas de Marcas
produtoRoutes.get("/produto-marcas", isAuth, ProdutoMarcaController.index);
produtoRoutes.post("/produto-marcas", isAuth, ProdutoMarcaController.store);
produtoRoutes.get("/produto-marcas/:marcaId", isAuth, ProdutoMarcaController.show);
produtoRoutes.put("/produto-marcas/:marcaId", isAuth, ProdutoMarcaController.update);
produtoRoutes.delete("/produto-marcas/:marcaId", isAuth, ProdutoMarcaController.remove);
produtoRoutes.post(
  "/produto-marcas/upload-logo",
  isAuth,
  upload.single("file"),
  ProdutoMarcaController.uploadLogo
);

// Rotas de Campos Personalizados
produtoRoutes.get("/produto-custom-fields", isAuth, ProdutoCustomFieldController.index);
produtoRoutes.post("/produto-custom-fields", isAuth, ProdutoCustomFieldController.store);
produtoRoutes.get("/produto-custom-fields/:fieldId", isAuth, ProdutoCustomFieldController.show);
produtoRoutes.put("/produto-custom-fields/:fieldId", isAuth, ProdutoCustomFieldController.update);
produtoRoutes.delete("/produto-custom-fields/:fieldId", isAuth, ProdutoCustomFieldController.remove);

export default produtoRoutes;
