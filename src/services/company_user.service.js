import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class CompanyUserService {
  async findAll() {
    return await prisma.companyUser.findMany();
  }

  async findOne(id) {
    const companyUser = await prisma.companyUser.findUnique({
      where: { id },
    });

    return companyUser ?? null;
  }

  async create(companyUser) {
    const { company_id, user_id, role, status } = companyUser;

    await prisma.companyUser.create({
      data: {
        company_id: Number(company_id),
        user_id: Number(user_id),
        role,
        status,
      },
    });

    return;
  }

  async update(id, data) {
    try {
      await prisma.companyUser.update({
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
      await prisma.companyUser.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
