import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

  async login(credentials, res) {
    const { email, password } = credentials;
    
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

    return {
      token: jwt.sign(
        {
          user_id: user.id,
          company_id: user.company_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
      ),
      companyId: user.company_id
    } 
  }
}
