import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class CompanyService {
  async findAll() {
    return await prisma.company.findMany();
  }

  async findOne(id) {
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        last_login: true,
      },
    });

    return !company ? null : company;
  }

  async create(company) {
    const {
      legal_name, fantasy_name, cnpj,
      email, phone, interval_slot,
      plan, status, approve_date,
    } = company;
    const now = new Date();

    await prisma.user.create({
      data: {
        legal_name, fantasy_name, cnpj,
        email, phone, interval_slot,
        plan, status, approve_date,
        created_at: now,
        updated_at: now,
      },
    });

    return;
  }

  async update(id, data) {
    try {
      await prisma.company.update({
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
      await prisma.user.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
