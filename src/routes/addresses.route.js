import { Router } from "express";
import AddressController from "../controllers/address.controller.js";

const addressesRouter = Router();
const controller = new AddressController();

// GET /
addressesRouter.get("/", controller.findAll);

// GET /id
addressesRouter.get("/:id", controller.findOne);

// POST /
addressesRouter.post("/", controller.create);

// PATCH /:id
addressesRouter.patch("/:id", controller.update);

// DELETE /:id
addressesRouter.delete("/:id", controller.delete);

export default addressesRouter;
