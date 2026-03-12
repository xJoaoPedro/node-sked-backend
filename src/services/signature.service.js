import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class SignatureService {
  async findAll() {
    return await prisma.signature.findMany();
  }

  async findOne(id) {
    const signature = await prisma.signature.findUnique({
      where: { id },
    });

    return signature ?? null;
  }

  async create(signature) {
    const {
      company_id,
      plan,
      status,
      start_date,
      renovation_date,
      cancellation_date,
      paid
    } = signature;

    await prisma.signature.create({
      data: {
        company_id: Number(company_id),
        plan,
        status,
        start_date,
        renovation_date,
        cancellation_date,
        paid
      },
    });

    return;
  }

  async update(id, data) {
    try {
      await prisma.signature.update({
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
      await prisma.signature.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
