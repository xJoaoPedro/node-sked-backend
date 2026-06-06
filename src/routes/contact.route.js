import { Router } from "express";
import ContactController from "../controllers/contact.controller.js";

const contactRouter = Router();
const controller = new ContactController();

contactRouter.post("/", controller.send);

export default contactRouter;
