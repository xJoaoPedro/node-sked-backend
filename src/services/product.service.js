import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import socketServer from "../socket.js";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const socket = socketServer;
const LOW_STOCK_THRESHOLD = 2;

export class ProductService {
  buildProductPayload(product, eventName) {
    return {
      id: product.id,
      company_id: product.company_id,
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      cost_price: product.cost_price,
      created_at: product.updated_at ?? product.created_at ?? new Date().toISOString(),
      title: "Atualizacao de produto",
      message: `O produto ${product.name} foi atualizado.`,
      type: "success",
      event: eventName,
    };
  }

  emitProductEvent(eventName, product, options = {}) {
    const payload = this.buildProductPayload(product, eventName);

    socket.emitNotificationToCompany(product.company_id, eventName, payload, options);
    socket.emitToCompany(
      product.company_id,
      "dashboard:updated",
      {
        company_id: product.company_id,
        source: "product",
        event: eventName,
        created_at: new Date().toISOString(),
      },
      options,
    );
  }

  emitLowStockNotification(product, options = {}) {
    socket.emitNotificationToCompany(
      product.company_id,
      "product:low-stock",
      {
        id: `product-low-stock-${product.id}-${product.updated_at?.toISOString?.() || Date.now()}`,
        company_id: product.company_id,
        product_id: product.id,
        name: product.name,
        quantity: product.quantity,
        created_at: product.updated_at ?? product.created_at ?? new Date().toISOString(),
        title: "Estoque baixo",
        message: `O produto ${product.name} entrou em estoque baixo com ${product.quantity} unidade${product.quantity === 1 ? "" : "s"}.`,
        type: "reminder",
      },
      options,
    );
  }

  shouldNotifyLowStock(previousQuantity, currentQuantity) {
    const previous = Number(previousQuantity);
    const current = Number(currentQuantity);

    return previous > LOW_STOCK_THRESHOLD && current <= LOW_STOCK_THRESHOLD;
  }

  async findAll() {
    return await prisma.product.findMany();
  }

  async findOne(id) {
    const service = await prisma.product.findUnique({
      where: { id },
    });

    return service ?? null;
  }

  async create(product, options = {}) {
    const {
      company_id,
      name,
      category,
      quantity,
      cost_price
    } = product;

    const createdProduct = await prisma.product.create({
      data: {
        name,
        category,
        quantity: Number(quantity),
        cost_price,

        company: { connect: { id: Number(company_id) } },
      },
    });

    this.emitProductEvent("product:created", createdProduct, options);

    if (Number(createdProduct.quantity) <= LOW_STOCK_THRESHOLD) {
      this.emitLowStockNotification(createdProduct, options);
    }

    return createdProduct;
  }

  async update(id, data, options = {}) {
    try {
      const currentProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!currentProduct) {
        return false;
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data,
      });

      this.emitProductEvent("product:updated", updatedProduct, options);

      if (this.shouldNotifyLowStock(currentProduct.quantity, updatedProduct.quantity)) {
        this.emitLowStockNotification(updatedProduct, options);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async delete(id, options = {}) {
    try {
      const deletedProduct = await prisma.product.delete({
        where: { id },
      });

      this.emitProductEvent("product:deleted", deletedProduct, options);

      return true;
    } catch (error) {
      return false;
    }
  }

  
}
