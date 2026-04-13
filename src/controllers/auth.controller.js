import { createCompanyValidator } from "../validators/company.validator.js";
import { createUserValidator } from "../validators/user.validator.js";
import { CompanyService } from "../services/company.service.js";
import { UserService } from "../services/user.service.js";

const companyService = new CompanyService();
const userService = new UserService();

function parse(req, res, type) {
  let parsed = null;

  switch (type) {
    case "user":
      parsed = createUserValidator.safeParse(req);
      break;
    case "company":
      parsed = createCompanyValidator.safeParse(req);
      break;
  }

  if (!parsed.success) {
    return res.status(400).json({
      message: "Dados inválidos",
      errors: JSON.parse(parsed.error),
    });
  }
}

export default class AuthController {
  async userRegister(req, res) {
    parse(req.body, res, "user");

    await userService.userRegister(req.body);

    res.status(204).json();
  }

  async companyRegister(req, res) {
    parse(req.body, res, "company");

    await companyService.create(req.body);

    res.status(204).json();
  }

  async userLogin(req, res) {
    parse(req.body, res, "user");

    const data = await userService.userLogin(req.body, res);

    return res.json(data);
  }

  async companyLogin(req, res) {
    parse(req.body, res, "company");

    const data = await companyService.login(req.body, res);

    return res.json(data);
  }
}
