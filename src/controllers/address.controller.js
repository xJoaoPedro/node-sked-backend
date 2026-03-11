import { AddressService } from "../services/address.service.js";
import {
  createAddressValidator,
  updateAddressValidator,
} from "../validators/address.validator.js";

const service = new AddressService();

export default class CompanyController {
  async findAll(req, res) {
    const addresses = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: addresses,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const address = await service.findOne(id);

    if (!address) {
      res.status(404).json({
        message: "Endereço não encontrado",
      });
    }

    res.status(200).json({
      message: "Endereço encontrado com sucesso!",
      data: address,
    });
  }

  async create(req, res) {
    const parsed = createAddressValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: JSON.parse(parsed.error),
      });
    }

    await service.create(req.body);

    res.status(204).json();
  }

  async update(req, res) {
    const parsed = updateAddressValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: JSON.parse(parsed.error),
      });
    }

    const update = await service.update(Number(req.params.id), parsed.data);

    if (update) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Endereço não encontrado",
      });
  }

  async delete(req, res) {
    const deleted = await service.delete(Number(req.params.id));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Endereço não encontrado",
      });
  }
}
