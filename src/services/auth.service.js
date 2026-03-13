import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const { PrismaClient } = pkg 
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export class AuthService {
  async login(credentials) {
    const { email, password } = credentials;
    
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

    return jwt.sign(
      {
        user_id: user.id,
        company_id: user.company_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
  }
}
