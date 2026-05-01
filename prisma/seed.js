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

// 🔥 slots de 30min
const TIME_SLOTS = Array.from({ length: (22 - 6) * 2 }, (_, i) => {
  const hour = 6 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  return { hour, minute };
});

// 🔥 horários com peso
function getWeightedTimeSlot() {
  const peakMorning = TIME_SLOTS.filter(s => s.hour >= 9 && s.hour <= 12);
  const peakEvening = TIME_SLOTS.filter(s => s.hour >= 17 && s.hour <= 20);

  const rand = Math.random();

  if (rand < 0.4) return getRandomItem(peakMorning);
  if (rand < 0.7) return getRandomItem(peakEvening);
  return getRandomItem(TIME_SLOTS);
}

// 🔥 cancelamentos
const CANCEL_REASONS = [
  "NO_SHOW",
  "SCHEDULE_CONFLICT",
  "ILLNESS",
  "EMERGENCY",
  "PROFESSIONAL_UNAVAILABLE",
  "OTHER",
];

// 💳 pagamentos
function getWeightedPaymentMethod() {
  const rand = Math.random();

  if (rand < 0.5) return "PIX";
  if (rand < 0.75) return "DEBIT";
  if (rand < 0.9) return "CREDIT";
  return "CASH";
}

// ---------------------
// Generator
// ---------------------
function generateAppointment({
  date,
  services,
  employees,
  clients,
  companyId,
  isFuture
}) {
  const service = getRandomItem(services);
  const employee = getRandomItem(employees);
  const client = getRandomItem(clients);

  const start = new Date(date);
  const slot = getWeightedTimeSlot();

  start.setHours(slot.hour, slot.minute, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + service.duration_minutes);

  if (end.getHours() > 22 || (end.getHours() === 22 && end.getMinutes() > 0)) {
    return null;
  }

  let status;
  let cancel_reason = null;
  let payment_method = null;

  if (isFuture) {
    const rand = Math.random();
    status = rand < 0.7 ? "CONFIRMED" : "PENDING";
  } else {
    const rand = Math.random();

    if (rand < 0.6) {
      status = "COMPLETED";
      payment_method = getWeightedPaymentMethod();
    } else if (rand < 0.8) {
      status = "CANCELED";
      cancel_reason = getRandomItem(CANCEL_REASONS);
    } else {
      status = "CONFIRMED";
    }
  }

  return {
    company_id: companyId,
    service_id: service.id,
    employee_id: employee.id,
    client_id: client.id,
    start_time: start,
    end_time: end,
    status,
    cancel_reason,
    payment_method,
  };
}

// ---------------------
// MAIN
// ---------------------
async function main() {
  const password = await bcrypt.hash("123456", 10);

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

  const services = await Promise.all([
    prisma.service.create({
      data: { company_id: company.id, name: "Corte", duration_minutes: 30, price: 50 },
    }),
    prisma.service.create({
      data: { company_id: company.id, name: "Barba", duration_minutes: 30, price: 30 },
    }),
    prisma.service.create({
      data: { company_id: company.id, name: "Combo", duration_minutes: 60, price: 70 },
    }),
  ]);

  const appointments = [];
  const today = new Date();

  // ---------------------
  // 📅 ÚLTIMOS 6 MESES (GARANTIDO)
  // ---------------------
  for (let m = 0; m < 6; m++) {
    const baseDate = new Date();
    baseDate.setDate(1); // 🔥 CRÍTICO
    baseDate.setMonth(today.getMonth() - m);

    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let monthAppointments = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);

      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      const activityChance = isWeekend ? 0.4 : 0.75;

      if (Math.random() > activityChance) continue;

      const count = isWeekend
        ? randomBetween(4, 10)
        : randomBetween(8, 20);

      const dailyAppointments = [];

      for (let i = 0; i < count; i++) {
        const apt = generateAppointment({
          date,
          services,
          employees,
          clients,
          companyId: company.id,
          isFuture: false,
        });

        if (apt) dailyAppointments.push(apt);
      }

      // ✔ garante COMPLETED no dia
      const hasCompleted = dailyAppointments.some(a => a.status === "COMPLETED");

      if (!hasCompleted && dailyAppointments.length > 0) {
        const i = Math.floor(Math.random() * dailyAppointments.length);
        dailyAppointments[i].status = "COMPLETED";
        dailyAppointments[i].payment_method = getWeightedPaymentMethod();
      }

      monthAppointments.push(...dailyAppointments);
    }

    // ✔ garante pelo menos 1 agendamento no mês
    if (monthAppointments.length === 0) {
      const fallbackDate = new Date(year, month, 15);

      const apt = generateAppointment({
        date: fallbackDate,
        services,
        employees,
        clients,
        companyId: company.id,
        isFuture: false,
      });

      if (apt) monthAppointments.push(apt);
    }

    // ✔ garante pelo menos 1 COMPLETED no mês
    const hasMonthCompleted = monthAppointments.some(a => a.status === "COMPLETED");

    if (!hasMonthCompleted) {
      const i = Math.floor(Math.random() * monthAppointments.length);
      monthAppointments[i].status = "COMPLETED";
      monthAppointments[i].payment_method = getWeightedPaymentMethod();
    }

    appointments.push(...monthAppointments);
  }

  await prisma.appointment.createMany({
    data: appointments,
  });

  console.log("🌱 Seed REALISTA e GARANTIDO!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());