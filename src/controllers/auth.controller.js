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
    parse(req.body, res, "user");

    await userService.create(req.body);

    res.status(204).json();
  }

  async companyRegister(req, res) {
    parse(req.body, res, "company");

    await companyService.create(req.body);

    res.status(204).json();
  }

  async userLogin(req, res) {
    parse(req.body, res, "user");

    const data = await userService.login(req.body, res);

    return res.json(data);
  }

  async companyLogin(req, res) {
    parse(req.body, res, "company");

    const data = await companyService.login(req.body, res);

    return res.json(data);
  }
}
