import { Router } from "express";
import AdminController from "../controllers/admin.controller.js";
import { adminAuth } from "../utils/admin-auth.js";

const adminRouter = Router();
const controller = new AdminController();

adminRouter.use(adminAuth);
adminRouter.get("/companies/pending", controller.listPendingCompanies);
adminRouter.patch("/companies/:id/approve", controller.approveCompany);

export default adminRouter;
