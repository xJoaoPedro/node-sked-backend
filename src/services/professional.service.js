import { PrismaPg } from "@prisma/adapter-pg";
import crypto from "crypto";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";
import { parseTimeToDate } from "../utils/parsers/timeParser.js";
import { EmailConflictError, assertEmailAvailable, normalizeEmail } from "./email-identity.service.js";
import { EmployeeAccessMailService } from "./employee-access-mail.service.js";

const { PrismaClient, Prisma } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const employeeAccessMailService = new EmployeeAccessMailService();

function generateTemporaryPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const randomBytes = crypto.randomBytes(length);

  return Array.from(randomBytes, (byte) => chars[byte % chars.length]).join("");
}

export class ProfessionalService {
  async findAll(company_id) {
    return await prisma.employee.findMany({
      where: {
        company_id: Number(company_id),
      },
      include: {
        user: true,
      },
    });
  }

  async findOne(id) {
    const employee = await prisma.employee.findUnique({
      where: { id: Number(id) },
      include: {
        user: true,
      },
    });

    return employee ?? null;
  }

  async create(data) {
    const {
      company_id,
      name,
      email: rawEmail,
      phone,
      status,
      services,
      scheduleOpenings,
    } = data;
    const email = normalizeEmail(rawEmail);
    const temporaryPassword = generateTemporaryPassword();

    try {
      await assertEmailAvailable(prisma, email);

      const company = await prisma.company.findUnique({
        where: { id: Number(company_id) },
        select: {
          id: true,
          fantasy_name: true,
          legal_name: true,
        },
      });

      if (!company) {
        return false;
      }

      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            phone,
            status: status || "ACTIVE",
          },
        });

        const employee = await tx.employee.create({
          data: {
            company_id: Number(company_id),
            user_id: user.id,
            name,
            email,
            phone,
            role: "EMPLOYEE",
            status,
          },
        });

        if (services?.length) {
          await tx.employeeService.createMany({
            data: services.map((service_id) => ({
              employee_id: employee.id,
              service_id: Number(service_id),
            })),
          });
        }

        if (scheduleOpenings?.length) {
          await tx.scheduleOpening.createMany({
            data: scheduleOpenings.map((opening) => ({
              company_id: Number(company_id),
              employee_id: employee.id,
              week_day: opening.week_day,
              start_time: parseTimeToDate(opening.start_time),
              end_time: parseTimeToDate(opening.end_time),
            })),
          });
        }

        return {
          userId: user.id,
          employeeId: employee.id,
        };
      });

      try {
        await employeeAccessMailService.sendWelcomeAccess({
          employeeName: name,
          employeeEmail: email,
          temporaryPassword,
          companyName: company.fantasy_name || company.legal_name,
        });
      } catch (mailError) {
        await prisma.$transaction(async (tx) => {
          await tx.employee.delete({
            where: { id: created.employeeId },
          });

          await tx.user.delete({
            where: { id: created.userId },
          });
        }).catch(() => null);

        throw mailError;
      }

      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new EmailConflictError();
      }

      console.error(error);
      throw error;
    }
  }

  async update(id, data) {
    const employeeId = Number(id);

    const {
      name,
      email,
      phone,
      status,
      user_id,
      services,
      scheduleOpenings,
    } = data;

    try {
      const currentEmployee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          company_id: true,
          user_id: true,
        },
      });

      if (!currentEmployee) {
        return false;
      }

      const normalizedEmail =
        typeof email === "string" ? normalizeEmail(email) : undefined;

      if (normalizedEmail) {
        await assertEmailAvailable(prisma, normalizedEmail, {
          excludeEmployeeId: employeeId,
          excludeUserId: currentEmployee.user_id,
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.employee.update({
          where: { id: employeeId },
          data: {
            name,
            email: normalizedEmail,
            phone,
            status,
          },
        });

        if (currentEmployee.user_id) {
          await tx.user.update({
            where: { id: currentEmployee.user_id },
            data: {
              ...(typeof name === "string" ? { name } : {}),
              ...(typeof normalizedEmail === "string" ? { email: normalizedEmail } : {}),
              ...(typeof phone === "string" ? { phone } : {}),
              ...(status ? { status } : {}),
            },
          });
        }

        if (services) {
          await tx.employeeService.deleteMany({
            where: { employee_id: employeeId },
          });

          await tx.employeeService.createMany({
            data: services.map((serviceId) => ({
              employee_id: employeeId,
              service_id: Number(serviceId),
            })),
          });
        }

        if (scheduleOpenings) {
          for (const opening of scheduleOpenings) {
            const start = opening.start_time
              ? parseTimeToDate(opening.start_time)
              : null;

            const end = opening.end_time
              ? parseTimeToDate(opening.end_time)
              : null;

            // 🔥 se limpou horário → remove
            if (!start || !end) {
              if (opening.id) {
                await tx.scheduleOpening.delete({
                  where: { id: opening.id },
                });
              }
              continue;
            }

            if (opening.id) {
              await tx.scheduleOpening.update({
                where: { id: opening.id },
                data: {
                  week_day: opening.week_day,
                  start_time: start,
                  end_time: end,
                },
              });
            } else {
              await tx.scheduleOpening.create({
                data: {
                  company_id: opening.company_id || currentEmployee.company_id,
                  employee_id: employeeId,
                  week_day: opening.week_day,
                  start_time: start,
                  end_time: end,
                },
              });
            }
          }
        }
      });

      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new EmailConflictError();
      }

      console.error(error);
      throw error;
    }
  }
  async delete(id) {
    try {
      const employeeId = Number(id);
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          user_id: true,
        },
      });

      if (!employee) {
        return false;
      }

      await prisma.$transaction(async (tx) => {
        await tx.employee.delete({
          where: { id: employeeId },
        });

        if (employee.user_id) {
          await tx.user.delete({
            where: { id: employee.user_id },
          });
        }
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}
