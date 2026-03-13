import { Router } from "express";
import AuthController from "../controllers/auth.controller.js";

const authRouter = Router();
const controller = new AuthController();

// POST /register
authRouter.post("/register", controller.register);

// POST /login
authRouter.post("/login", controller.login);

export default authRouter;
