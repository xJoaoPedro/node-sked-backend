import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class AddressService {
  async findAll() {
    return await prisma.address.findMany();
  }

  async findOne(id) {
    const address = await prisma.address.findUnique({
      where: { id },
    });

    return address ?? null;
  }

  async create(address) {
    const {
      company_id,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    } = address;

    await prisma.address.create({
      data: {
        company_id: Number(company_id),
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
      },
    });

    return;
  }

  async update(id, data) {
    try {
      await prisma.address.update({
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
      await prisma.address.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
