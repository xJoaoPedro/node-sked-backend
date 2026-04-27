import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ---------------------
// Utils
// ---------------------
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 🔥 slots de 30min (06:00 → 21:30)
const TIME_SLOTS = Array.from({ length: (22 - 6) * 2 }, (_, i) => {
  const hour = 6 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  return { hour, minute };
});

// 🔥 nova função corrigida
function generateAppointment({ date, services, employees, clients, companyId, isFuture }) {
  const service = getRandomItem(services);
  const employee = getRandomItem(employees);
  const client = getRandomItem(clients);

  const start = new Date(date);

  const slot = getRandomItem(TIME_SLOTS);
  start.setHours(slot.hour, slot.minute, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + service.duration_minutes);

  // ❌ bloqueia passar das 22h
  if (end.getHours() > 22 || (end.getHours() === 22 && end.getMinutes() > 0)) {
    return null;
  }

  let status;

  if (isFuture) {
    status = Math.random() > 0.2 ? "CONFIRMED" : "PENDING";
  } else {
    const rand = Math.random();
    if (rand < 0.7) status = "COMPLETED";
    else if (rand < 0.9) status = "CANCELED";
    else status = "CONFIRMED";
  }

  return {
    company_id: companyId,
    service_id: service.id,
    employee_id: employee.id,
    client_id: client.id,
    start_time: start,
    end_time: end,
    status,
  };
}

// ---------------------
// MAIN
// ---------------------
async function main() {
  const password = await bcrypt.hash("123456", 10);

  // Company
  const company = await prisma.company.create({
    data: {
      legal_name: "Empresa LTDA",
      fantasy_name: "Empresa Teste",
      cnpj: "12345678000199",
      email: "admin@empresa.com",
      password,
      status: "APPROVED",
    },
  });

  // Admin
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@empresa.com",
      password,
      phone: "51999999999",
    },
  });

  await prisma.companyUser.create({
    data: {
      company_id: company.id,
      user_id: admin.id,
      role: "MANAGER",
    },
  });

  // Employees
  const employees = await Promise.all(
    Array.from({ length: 3 }).map((_, i) =>
      prisma.user.create({
        data: {
          name: `Funcionario ${i + 1}`,
          email: `func${i + 1}@empresa.com`,
          password,
          phone: "51999999999",
        },
      })
    )
  );

  for (const emp of employees) {
    await prisma.companyUser.create({
      data: {
        company_id: company.id,
        user_id: emp.id,
        role: "EMPLOYEE",
      },
    });
  }

  // Clients
  const clients = await Promise.all(
    Array.from({ length: 30 }).map((_, i) =>
      prisma.user.create({
        data: {
          name: `Cliente ${i + 1}`,
          email: `cliente${i + 1}@mail.com`,
          password,
          phone: "51988888888",
        },
      })
    )
  );

  // 🔥 Services (compatíveis com 30min)
  const services = await Promise.all([
    prisma.service.create({
      data: { company_id: company.id, name: "Corte de cabelo", duration_minutes: 30, price: 50 },
    }),
    prisma.service.create({
      data: { company_id: company.id, name: "Barba", duration_minutes: 30, price: 30 },
    }),
    prisma.service.create({
      data: { company_id: company.id, name: "Corte + Barba", duration_minutes: 60, price: 70 },
    }),
    prisma.service.create({
      data: { company_id: company.id, name: "Progressiva", duration_minutes: 120, price: 200 },
    }),
    prisma.service.create({
      data: { company_id: company.id, name: "Hidratação", duration_minutes: 60, price: 80 },
    }),
  ]);

  const appointments = [];
  const today = new Date();

  // Últimos 6 meses
  for (let m = 0; m < 6; m++) {
    const baseDate = new Date();
    baseDate.setMonth(today.getMonth() - m);

    const daysInMonth = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() + 1,
      0
    ).getDate();

    const activeDays = randomBetween(15, 22);

    for (let d = 0; d < activeDays; d++) {
      const day = randomBetween(1, daysInMonth);

      const date = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        day
      );

      const count = randomBetween(5, 12);

      for (let i = 0; i < count; i++) {
        const apt = generateAppointment({
          date,
          services,
          employees,
          clients,
          companyId: company.id,
          isFuture: false,
        });

        if (apt) appointments.push(apt);
      }
    }
  }

  // Últimos 3 dias
  for (let d = 1; d <= 3; d++) {
    const date = new Date();
    date.setDate(today.getDate() - d);

    const count = randomBetween(10, 20);

    for (let i = 0; i < count; i++) {
      const apt = generateAppointment({
        date,
        services,
        employees,
        clients,
        companyId: company.id,
        isFuture: false,
      });

      if (apt) appointments.push(apt);
    }
  }

  // 🔥 HOJE
  for (let i = 0; i < 12; i++) {
    const apt = generateAppointment({
      date: today,
      services,
      employees,
      clients,
      companyId: company.id,
      isFuture: true,
    });

    if (apt) appointments.push(apt);
  }

  // Próximos 3 dias
  for (let d = 1; d <= 3; d++) {
    const date = new Date();
    date.setDate(today.getDate() + d);

    const count = randomBetween(10, 20);

    for (let i = 0; i < count; i++) {
      const apt = generateAppointment({
        date,
        services,
        employees,
        clients,
        companyId: company.id,
        isFuture: true,
      });

      if (apt) appointments.push(apt);
    }
  }

  // Save
  await prisma.appointment.createMany({
    data: appointments,
  });

  console.log("🌱 Seed COMPLETO com grade de 30min (06h–22h)!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());