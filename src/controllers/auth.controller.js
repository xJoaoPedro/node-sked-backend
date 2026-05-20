import jwt from "jsonwebtoken";
import { createCompanyValidator, loginCompanyValidator } from "../validators/company.validator.js";
import { createUserValidator, loginUserValidator } from "../validators/user.validator.js";
import { CompanyConflictError, CompanyService } from "../services/company.service.js";
import { UserService } from "../services/user.service.js";

const companyService = new CompanyService();
const userService = new UserService();

function parse(body, res, type) {
  let parsed = null;

  switch (type) {
    case "user-register":
      parsed = createUserValidator.safeParse(body);
      break;
    case "user-login":
      parsed = loginUserValidator.safeParse(body);
      break;
    case "company-register":
      parsed = createCompanyValidator.safeParse(body);
      break;
    case "company-login":
      parsed = loginCompanyValidator.safeParse(body);
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
    if (!parse(req.body, res, "user-register")) return;

    await userService.create(req.body);

    res.status(204).json();
  }

  async companyRegister(req, res) {
    if (!parse(req.body, res, "company-register")) return;

    try {
      await companyService.create(req.body);
    } catch (error) {
      if (error instanceof CompanyConflictError) {
        return res.status(409).json({
          message: error.message,
        });
      }

      throw error;
    }

    res.status(204).json();
  }

  async userLogin(req, res) {
    if (!parse(req.body, res, "user-login")) return;

    const data = await userService.login(req.body, res);
    if (!data) return;

    return res.json(data);
  }

  async companyLogin(req, res) {
    if (!parse(req.body, res, "company-login")) return;

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
