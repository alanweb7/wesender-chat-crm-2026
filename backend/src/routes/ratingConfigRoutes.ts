import express from "express";
import isAuth from "../middleware/isAuth";
import * as RatingConfigController from "../controllers/RatingConfigController";

const ratingConfigRoutes = express.Router();

ratingConfigRoutes.get("/rating-configs", isAuth, RatingConfigController.index);
ratingConfigRoutes.get("/rating-configs/:id", isAuth, RatingConfigController.show);
ratingConfigRoutes.post("/rating-configs", isAuth, RatingConfigController.store);
ratingConfigRoutes.put("/rating-configs/:id", isAuth, RatingConfigController.update);
ratingConfigRoutes.delete("/rating-configs/:id", isAuth, RatingConfigController.remove);

export default ratingConfigRoutes;
