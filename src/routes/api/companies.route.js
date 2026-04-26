import { Router } from "express";
import CompanyController from "../../controllers/company.controller.js";

const companiesRouter = Router();
const controller = new CompanyController();

// GET /
companiesRouter.get("/", controller.findAll);

// GET /id
companiesRouter.get("/:id", controller.findOne);

// GET /id/data (todos dados de empresa)
companiesRouter.get('/:id/data', controller.getAllData);

// PATCH /:id
companiesRouter.patch("/:id", controller.update);

// DELETE /:id
companiesRouter.delete("/:id", controller.delete);

export default companiesRouter;
