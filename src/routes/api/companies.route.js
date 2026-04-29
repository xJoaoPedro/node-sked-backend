import { Router } from "express";
import CompanyController from "../../controllers/company.controller.js";

const companiesRouter = Router();
const controller = new CompanyController();

// GET /
companiesRouter.get("/", controller.findAll);

// GET /id
companiesRouter.get("/:id", controller.findOne);

// TODO DOCUMENTAR ESSA BOMBA TBM
// GET /id/data (todos dados de empresa)
companiesRouter.get('/:id/data', controller.getAllData);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/appointments (todos os agendamentos de uma empresa)
companiesRouter.get('/:id/appointments', controller.getAppointments);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/cancellations (todos os cancelamentos de uma empresa)
companiesRouter.get('/:id/cancellations', controller.getCancellations);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/cancellations (todas as infos sobre cancelamentos com intervalo de tempo)
companiesRouter.get('/:id/cancellations/summary', controller.getInitialCancellations);

// PATCH /:id
companiesRouter.patch("/:id", controller.update);

// DELETE /:id
companiesRouter.delete("/:id", controller.delete);

export default companiesRouter;
