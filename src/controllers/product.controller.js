import { ProductService } from "../services/product.service.js";
import {
  createProductValidator,
  updateProductValidator,
} from "../validators/product.validator.js";

const service = new ProductService();
const getRealtimeOptions = (req) => ({
  excludedSocketId: req.headers["x-socket-id"],
});

export default class ProductController {
  async findAll(req, res) {
    const products = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: products,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const productConsult = await service.findOne(id);

    if (!productConsult) {
      res.status(404).json({
        message: "Produto não encontrado",
      });
    }

    res.status(200).json({
      message: "Produto encontrado com sucesso!",
      data: productConsult,
    });
  }

  async create(req, res) {
    const parsed = createProductValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: JSON.parse(parsed.error),
      });
    }

    const created = await service.create(req.body, getRealtimeOptions(req));

    res.status(200).json({
      message: "Produto criado com sucesso!",
      data: created
    });
  }

  async update(req, res) {
    const parsed = updateProductValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: JSON.parse(parsed.error),
      });
    }

    const update = await service.update(Number(req.params.id), parsed.data, getRealtimeOptions(req));

    if (update) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Produto não encontrado",
      });
  }

  async delete(req, res) {
    const deleted = await service.delete(Number(req.params.id), getRealtimeOptions(req));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Produto não encontrado",
      });
  }

  async getPageData(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const data = await service.findOne(id);

    if (!data) {
      res.status(404).json({
        message: "Houve algum erro na requisição",
      });
    }

    res.status(200).json({
      message: "",
      data: data,
    });
  }
}
