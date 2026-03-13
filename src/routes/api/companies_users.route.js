import { Router } from "express";
import CompanyUserController from "../../controllers/company_user.controller.js";

const companiesUsersRouter = Router();
const controller = new CompanyUserController();

// GET /
companiesUsersRouter.get("/", controller.findAll);

// GET /id
companiesUsersRouter.get("/:id", controller.findOne);

// POST /
companiesUsersRouter.post("/", controller.create);

// PATCH /:id
companiesUsersRouter.patch("/:id", controller.update);

// DELETE /:id
companiesUsersRouter.delete("/:id", controller.delete);

export default companiesUsersRouter;
