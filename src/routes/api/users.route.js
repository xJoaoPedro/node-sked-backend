import { Router } from "express";
import UserController from "../../controllers/user.controller.js";
import { authorizeUserSelfAccess } from "../../utils/authenticators/user-access.js";

const usersRouter = Router();
const controller = new UserController();

// GET /
usersRouter.get("/", controller.findAll);

// GET /id
usersRouter.get("/:id", authorizeUserSelfAccess, controller.findOne);

// PATCH /:id
usersRouter.patch("/:id", authorizeUserSelfAccess, controller.update);

// DELETE /:id
usersRouter.delete("/:id", authorizeUserSelfAccess, controller.delete);

export default usersRouter;
