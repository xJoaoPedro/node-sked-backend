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
      buffer_minutes,
      price,
      status,
    } = service;

    await prisma.service.create({
      data: {
        name,
        description,
        duration_minutes: Number(duration_minutes),
        buffer_minutes: buffer_minutes !== undefined ? Number(buffer_minutes) : undefined,
        price: Number(price),
        status,

        company: { connect: { id: Number(company_id) } },
      },
    });

    return;
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
