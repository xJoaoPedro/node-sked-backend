import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class ServiceService {
  async findAll() {
    return await prisma.service.findMany();
  }

  async findOne(id) {
    const service = await prisma.service.findUnique({
      where: { id },
    });

    return service ?? null;
  }

  async create(service) {
    const {
      company_id,
      name,
      description,
      duration_minutes,
      price,
      status,
      commission,
      category
    } = service;

    return await prisma.service.create({
      data: {
        name,
        description,
        duration_minutes: Number(duration_minutes),
        price: Number(price),
        status,
        commission,
        category,

        company: { connect: { id: Number(company_id) } },
      },
    });
  }

  async update(id, data) {
    try {
      await prisma.service.update({
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
      await prisma.service.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
