import { Router } from "express";
import ProductController from "../../controllers/product.controller.js";

const productsRouter = Router();
const controller = new ProductController();

// GET /
productsRouter.get("/", controller.findAll);

// GET /id
productsRouter.get("/:id", controller.findOne);

// POST /
productsRouter.post("/", controller.create);

// PATCH /:id
productsRouter.patch("/:id", controller.update);

// DELETE /:id
productsRouter.delete("/:id", controller.delete);

export default productsRouter;
