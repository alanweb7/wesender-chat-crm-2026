import express from "express";

import isAuth from "../middleware/isAuth";
import * as ServicoController from "../controllers/ServicoController";

const servicoRoutes = express.Router();

servicoRoutes.use(isAuth);

servicoRoutes.get("/servicos", ServicoController.index);
servicoRoutes.get("/servicos/:servicoId", ServicoController.show);
servicoRoutes.post("/servicos", ServicoController.store);
servicoRoutes.put("/servicos/:servicoId", ServicoController.update);
servicoRoutes.delete("/servicos/:servicoId", ServicoController.remove);

// Alias em inglês para compatibilidade com frontend
servicoRoutes.get("/services", ServicoController.index);
servicoRoutes.get("/services/:servicoId", ServicoController.show);
servicoRoutes.post("/services", ServicoController.store);
servicoRoutes.put("/services/:servicoId", ServicoController.update);
servicoRoutes.delete("/services/:servicoId", ServicoController.remove);

export default servicoRoutes;
