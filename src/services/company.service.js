import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const { PrismaClient } = pkg 
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class CompanyService {
  async findAll() {
    return await prisma.company.findMany();
  }

  async findOne(id) {
    const company = await prisma.company.findUnique({
      where: { id },
    });

    return company ?? null;
  }

  async create(company) {
    const {
      legal_name, fantasy_name, cnpj,
      email, password, phone, interval_slot,
      plan, status, approve_date,
    } = company;
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.company.create({
      data: {
        legal_name, fantasy_name, cnpj, email, 
        password: hashedPassword, phone, interval_slot,
        plan, status, approve_date,
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
      await prisma.company.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async login(credentials, res) {
    const { email, password } = credentials;
    
    const user = await prisma.company.findUnique({
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
