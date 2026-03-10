import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class UserService {
  async findAll() {
    return await prisma.user.findMany();
  }

  async findOne(id) {
    const user = await prisma.user.findUnique({
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

    return !user ? null : user;
  }

  async create(user) {
    const { name, email, password, phone } = user;
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        created_at: now,
        updated_at: now,
      },
    });

    return;
  }

  async update(id, data) {
    try {
      const user = await prisma.user.update({
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
      const user = await prisma.user.delete({
        where: { id },
      });

      return user;
    } catch (error) {
      return false;
    }
  }
}
