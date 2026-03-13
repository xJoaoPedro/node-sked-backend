import { Router } from "express";
import UserController from "../../controllers/user.controller.js";

const usersRouter = Router();
const controller = new UserController();

// GET /
usersRouter.get("/", controller.findAll);

// GET /id
usersRouter.get("/:id", controller.findOne);

// POST /
usersRouter.post("/", controller.create);

// PATCH /:id
usersRouter.patch("/:id", controller.update);

// DELETE /:id
usersRouter.delete("/:id", controller.delete);

export default usersRouter;
