import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class ProductService {
  async findAll() {
    return await prisma.product.findMany();
  }

  async findOne(id) {
    const service = await prisma.product.findUnique({
      where: { id },
    });

    return service ?? null;
  }

  async create(product) {
    const {
      company_id,
      name,
      category,
      quantity,
      cost_price
    } = product;

    return await prisma.product.create({
      data: {
        name,
        category,
        quantity: Number(quantity),
        cost_price,

        company: { connect: { id: Number(company_id) } },
      },
    });
  }

  async update(id, data) {
    try {
      await prisma.product.update({
        where: { id },
        data,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async delete(id) {
    try {
      await prisma.product.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  
}
