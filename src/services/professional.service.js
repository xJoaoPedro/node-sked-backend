import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import { parseTimeToDate } from "../utils/parsers/timeParser.js";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
      user_id,
      name,
      email,
      phone,
      role,
      status,
      services,
      scheduleOpenings,
    } = data;

    try {
      const employee = await prisma.employee.create({
        data: {
          company_id: Number(company_id),
          user_id: user_id ? Number(user_id) : null,
          name,
          email,
          phone,
          role: 'EMPLOYEE',
          status,
        },
      });

      if (services?.length) {
        await prisma.employeeService.createMany({
          data: services.map(service_id => ({
            employee_id: employee.id,
            service_id: Number(service_id),
          })),
        });
      }

      if (scheduleOpenings?.length) {
        await prisma.scheduleOpening.createMany({
          data: scheduleOpenings.map(opening => ({
            company_id: Number(company_id),
            employee_id: employee.id,
            week_day: opening.week_day,
            start_time: parseTimeToDate(opening.start_time),
            end_time: parseTimeToDate(opening.end_time),
          })),
        });
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
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
      await prisma.$transaction(async (tx) => {
        await tx.employee.update({
          where: { id: employeeId },
          data: {
            name,
            email,
            phone,
            status,
            user_id: user_id ? Number(user_id) : null,
          },
        });

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
                  company_id: opening.company_id,
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
      console.error(error);
      return false;
    }
  }
  async delete(id) {
    try {
      await prisma.employee.delete({
        where: { id: Number(id) },
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}