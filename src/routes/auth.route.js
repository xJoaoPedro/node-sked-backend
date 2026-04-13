import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";

const authRouter = Router();
const controller = new AuthController();

// POST /register
authRouter.post("/companies/register", controller.companyRegister);
authRouter.post("/users/register", controller.userRegister);

// POST /login
authRouter.post("/companies/login", controller.companyLogin);
authRouter.post("/users/login", controller.userLogin);

export default authRouter;
