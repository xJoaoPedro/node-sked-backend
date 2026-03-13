import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";

const { PrismaClient } = pkg 
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class UserService {
  async findAll() {
	  try {
		  return await prisma.user.findMany();
	  } catch (err) {
		  console.log(err);
	  }
    return await prisma.user.findMany();
  }

  async findOne(id) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    return user ?? null;
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
      },
    });

    return;
  }

  async update(id, data) {
    try {
      await prisma.user.update({
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
