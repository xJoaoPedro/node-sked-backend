import jwt from "jsonwebtoken";
import { createCompanyValidator } from "../validators/company.validator.js";
import { createUserValidator } from "../validators/user.validator.js";
import { CompanyService } from "../services/company.service.js";
import { UserService } from "../services/user.service.js";

const companyService = new CompanyService();
const userService = new UserService();

function parse(body, res, type) {
  let parsed = null;

  switch (type) {
    case "user":
      parsed = createUserValidator.safeParse(body);
      break;
    case "company":
      parsed = createCompanyValidator.safeParse(body);
      break;
  }

  if (!parsed.success) {
    res.status(400).json({
      message: "Dados inválidos",
      errors: parsed.error.format(),
    });

    return false;
  }

  return true;
}

export default class AuthController {
  async userRegister(req, res) {
    if (!parse(req.body, res, "user")) return;

    await userService.create(req.body);

    res.status(204).json();
  }

  async companyRegister(req, res) {
    if (!parse(req.body, res, "company")) return;

    await companyService.create(req.body);

    res.status(204).json();
  }

  async userLogin(req, res) {
    if (!parse(req.body, res, "user")) return;

    const data = await userService.login(req.body, res);
    if (!data) return;

    return res.json(data);
  }

  async companyLogin(req, res) {
    if (!parse(req.body, res, "company")) return;

    const data = await companyService.login(req.body, res);
    if (!data) return;

    return res.json(data);
  }

  async refreshSession(req, res) {
    const currentUser = req.user || {};
    const payload = { ...currentUser };

    delete payload.iat;
    delete payload.exp;

    const isUserSession = payload.auth_type === "user" || Boolean(payload.user_id);
    const expiresIn = isUserSession ? "1d" : "1h";

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn },
    );

    return res.status(200).json({ token });
  }
}
