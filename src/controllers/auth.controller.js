import { AuthService } from "../services/auth.service.js";
import { createUserValidator } from "../validators/user.validator.js";
import jwt from "jsonwebtoken";

const service = new AuthService();

export default class AppointmentController {
  async register(req, res) {
    const parsed = createAppointmentValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: JSON.parse(parsed.error),
      });
    }

    await service.create(req.body);

    res.status(204).json();
  }

  async login(req, res) {
    const parsed = createUserValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: JSON.parse(parsed.error),
      });
    }

    const token = await service.login(req.body)

    return res.json({ token })
  } 
}
