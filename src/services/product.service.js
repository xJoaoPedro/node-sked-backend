import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import socketServer from "../socket.js";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const socket = socketServer;

export class ProductService {
  async getLowStockThreshold(companyId) {
    const company = await prisma.company.findUnique({
      where: { id: Number(companyId) },
      select: { low_stock_threshold: true },
    });

    return company?.low_stock_threshold ?? 2;
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

  emitOutOfStockNotification(product, options = {}) {
    socket.emitNotificationToCompany(
      product.company_id,
      "product:out-of-stock",
      {
        id: `product-out-of-stock-${product.id}-${product.updated_at?.toISOString?.() || Date.now()}`,
        company_id: product.company_id,
        product_id: product.id,
        name: product.name,
        quantity: product.quantity,
        created_at: product.updated_at ?? product.created_at ?? new Date().toISOString(),
        title: "Produto esgotado",
        message: `O produto ${product.name} ficou sem estoque.`,
        type: "cancellation",
      },
      options,
    );
  }

  emitRestockedNotification(product, options = {}) {
    socket.emitNotificationToCompany(
      product.company_id,
      "product:restocked",
      {
        id: `product-restocked-${product.id}-${product.updated_at?.toISOString?.() || Date.now()}`,
        company_id: product.company_id,
        product_id: product.id,
        name: product.name,
        quantity: product.quantity,
        created_at: product.updated_at ?? product.created_at ?? new Date().toISOString(),
        title: "Estoque reabastecido",
        message: `O produto ${product.name} voltou ao estoque normal com ${product.quantity} unidade${product.quantity === 1 ? "" : "s"}.`,
        type: "success",
      },
      options,
    );
  }

  shouldNotifyLowStock(previousQuantity, currentQuantity, threshold) {
    const previous = Number(previousQuantity);
    const current = Number(currentQuantity);

    return current > 0 && current <= threshold && (
      previous > threshold || previous <= 0
    );
  }

  shouldNotifyOutOfStock(previousQuantity, currentQuantity) {
    const previous = Number(previousQuantity);
    const current = Number(currentQuantity);

    return previous > 0 && current <= 0;
  }

  shouldNotifyRestocked(previousQuantity, currentQuantity, threshold) {
    const previous = Number(previousQuantity);
    const current = Number(currentQuantity);

    return previous <= threshold && current > threshold;
  }

  emitInventoryNotification(previousQuantity, product, threshold, options = {}) {
    if (this.shouldNotifyOutOfStock(previousQuantity, product.quantity)) {
      this.emitOutOfStockNotification(product, options);
      return;
    }

    if (this.shouldNotifyLowStock(previousQuantity, product.quantity, threshold)) {
      this.emitLowStockNotification(product, options);
      return;
    }

    if (this.shouldNotifyRestocked(previousQuantity, product.quantity, threshold)) {
      this.emitRestockedNotification(product, options);
    }
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

    const lowStockThreshold = await this.getLowStockThreshold(createdProduct.company_id);

    if (Number(createdProduct.quantity) <= 0) {
      this.emitOutOfStockNotification(createdProduct, options);
    } else if (Number(createdProduct.quantity) <= lowStockThreshold) {
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

      const lowStockThreshold = await this.getLowStockThreshold(updatedProduct.company_id);

      this.emitInventoryNotification(
        currentProduct.quantity,
        updatedProduct,
        lowStockThreshold,
        options,
      );

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

      return true;
    } catch (error) {
      return false;
    }
  }

  
}
