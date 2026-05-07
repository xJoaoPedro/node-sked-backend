import {
  CustomerConflictError,
  CustomerNotFoundError,
  CustomerService,
} from "../services/customer.service.js";
import { createCustomerValidator } from "../validators/customer.validator.js";

const service = new CustomerService();

export default class CustomerController {
  async create(req, res) {
    const parsed = createCustomerValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: parsed.error.flatten(),
      });
    }

    try {
      const created = await service.create(parsed.data);

      return res.status(200).json({
        message: "Cliente cadastrado com sucesso!",
        data: created,
      });
    } catch (error) {
      if (error instanceof CustomerConflictError) {
        return res.status(409).json({
          message: error.message,
        });
      }

      if (error instanceof CustomerNotFoundError) {
        return res.status(404).json({
          message: error.message,
        });
      }

      if (error instanceof Error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      throw error;
    }
  }
}
