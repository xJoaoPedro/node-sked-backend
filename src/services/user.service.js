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
		  return await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          last_login: true,
          created_at: true,
          updated_at: true,
        },
      });
	  } catch (err) {
		  console.log(err);
	  }
    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
    });
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
        created_at: true,
        updated_at: true,
      },
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
      const nextData = { ...data };

      if (typeof nextData.password === "string" && nextData.password.length > 0) {
        nextData.password = await bcrypt.hash(nextData.password, 10);
      } else {
        delete nextData.password;
      }

      await prisma.user.update({
        where: { id },
        data: nextData,
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
      include: {
        employee: {
          select: {
            id: true,
            company_id: true,
            role: true,
            status: true,
            company: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" });

    if (!user.employee?.company_id || !user.employee?.company?.id) {
      return res.status(403).json({ error: "Usuário não pertence a nenhuma empresa" });
    }

    if (user.employee.status !== "ACTIVE") {
      return res.status(403).json({ error: "Funcionário desativado" });
    }

    if (user.employee.company.status !== "APPROVED") {
      return res.status(403).json({ error: "Empresa não está disponível para acesso" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        last_login: new Date(),
      },
    });

    return {
      token: jwt.sign(
        {
          user_id: user.id,
          employee_id: user.employee.id,
          company_id: user.employee.company_id,
          role: user.employee.role,
          auth_type: "user",
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
      ),
      companyId: user.employee.company_id,
      employeeId: user.employee.id,
      role: user.employee.role,
    } 
  }
}
