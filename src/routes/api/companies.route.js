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

// GET /:id/appointments/export (todos os agendamentos de uma empresa sem paginação)
companiesRouter.get('/:id/appointments/export', controller.exportAppointments);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/cancellations (todos os cancelamentos de uma empresa)
companiesRouter.get('/:id/cancellations', controller.getCancellations);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/cancellations/summary (todas as infos sobre cancelamentos com intervalo de tempo)
companiesRouter.get('/:id/cancellations/summary', controller.getInitialCancellations);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/revenue (todas informações sobre receita de uma empresa)
companiesRouter.get('/:id/revenue', controller.getRevenues);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/revenue/summary (todas as infos sobre receita com intervalo de tempo)
companiesRouter.get('/:id/revenue/summary', controller.getInitialRevenues);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/services (todos os servicos de uma empresa)
companiesRouter.get('/:id/services', controller.getServices);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/products (todos as infos de produtos de uma empresa)
companiesRouter.get('/:id/products', controller.getProducts);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/professionals (todos as infos de profissionais de uma empresa)
companiesRouter.get('/:id/professionals', controller.getProfessionals);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/customers (todos os clientes de uma empresa)
companiesRouter.get('/:id/customers', controller.getCustomers);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/customers/summary (todas as infos de clientes de uma empresa)
companiesRouter.get('/:id/customers/summary', controller.getInitialCustomers);

// TODO DOCUMENTAR ESSA BOMBA
// GET /:id/settings
companiesRouter.get('/:id/settings', controller.getSettings);

// GET /:id/evolution/status
companiesRouter.get('/:id/evolution/status', controller.getEvolutionStatus);

// POST /:id/evolution/connect
companiesRouter.post('/:id/evolution/connect', controller.connectEvolutionInstance);

// PATCH /:id
companiesRouter.patch("/:id", controller.update);

// DELETE /:id
companiesRouter.delete("/:id", controller.delete);

export default companiesRouter;
