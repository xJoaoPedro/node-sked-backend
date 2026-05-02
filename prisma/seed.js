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

function getRandomCommission(min = 30, max = 50) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

// ---------------------
// Products helpers
// ---------------------
const PRODUCT_NAMES = {
  HAIR: ["Shampoo Profissional", "Condicionador", "Pomada Modeladora"],
  BEARD: ["Óleo de Barba", "Balm", "Shampoo Barba"],
  AESTHETIC: ["Creme Facial", "Sérum", "Hidratante"],
  BEAUTY: ["Base", "Primer", "Fixador"],
  OTHER: ["Produto Genérico"],
};

function getRandomProduct(category) {
  return getRandomItem(PRODUCT_NAMES[category] || PRODUCT_NAMES.OTHER);
}

// ---------------------
// Appointment utils
// ---------------------
const TIME_SLOTS = Array.from({ length: (22 - 6) * 2 }, (_, i) => {
  const hour = 6 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  return { hour, minute };
});

function getWeightedTimeSlot() {
  const peakMorning = TIME_SLOTS.filter(s => s.hour >= 9 && s.hour <= 12);
  const peakEvening = TIME_SLOTS.filter(s => s.hour >= 17 && s.hour <= 20);

  const rand = Math.random();

  if (rand < 0.4) return getRandomItem(peakMorning);
  if (rand < 0.7) return getRandomItem(peakEvening);
  return getRandomItem(TIME_SLOTS);
}

const CANCEL_REASONS = [
  "NO_SHOW",
  "SCHEDULE_CONFLICT",
  "ILLNESS",
  "EMERGENCY",
  "PROFESSIONAL_UNAVAILABLE",
  "OTHER",
];

function getWeightedPaymentMethod() {
  const rand = Math.random();

  if (rand < 0.5) return "PIX";
  if (rand < 0.75) return "DEBIT";
  if (rand < 0.9) return "CREDIT";
  return "CASH";
}

// ---------------------
// Appointment generator
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

  if (end.getHours() > 22) return null;

  let status;
  let cancel_reason = null;
  let payment_method = null;

  if (isFuture) {
    status = Math.random() < 0.7 ? "CONFIRMED" : "PENDING";
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
    employee_id: employee.id, // 🔥 agora é Employee
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

  // COMPANY
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

  // ADMIN (vira MANAGER via Employee)
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@empresa.com",
      password,
      phone: "51999999999",
    },
  });

  const adminEmployee = await prisma.employee.create({
    data: {
      company_id: company.id,
      user_id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      phone: adminUser.phone,
      role: "MANAGER",
    },
  });

  // EMPLOYEES
  const employees = [];

  for (let i = 0; i < 3; i++) {
    const user = await prisma.user.create({
      data: {
        name: `Funcionario ${i + 1}`,
        email: `func${i + 1}@empresa.com`,
        password,
        phone: "51999999999",
      },
    });

    const employee = await prisma.employee.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: "EMPLOYEE",
      },
    });

    employees.push(employee);
  }

  // CLIENTS
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

  // SERVICES
  const services = await Promise.all([
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Corte",
        category: "HAIR",
        duration_minutes: 30,
        price: 50,
        commission: 40,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Barba",
        category: "BEARD",
        duration_minutes: 30,
        price: 30,
        commission: 30,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Combo (Corte + Barba)",
        category: "HAIR",
        duration_minutes: 60,
        price: 70,
        commission: 45,
      },
    }),
  ]);

  // 🔥 vínculo N:N Employee ↔ Service
  for (const employee of employees) {
    for (const service of services) {
      if (Math.random() > 0.3) {
        await prisma.employeeService.create({
          data: {
            employee_id: employee.id,
            service_id: service.id,
          },
        });
      }
    }
  }

  // PRODUCTS
  const productCategories = ["HAIR", "BEARD", "AESTHETIC", "BEAUTY"];

  await Promise.all(
    productCategories.flatMap((category) =>
      Array.from({ length: 2 }).map(() =>
        prisma.product.create({
          data: {
            company_id: company.id,
            name: getRandomProduct(category),
            category,
            quantity: randomBetween(5, 50),
            cost_price: Number((Math.random() * 20 + 5).toFixed(2)),
          },
        })
      )
    )
  );

  // APPOINTMENTS
  const appointments = [];
  const today = new Date();

  for (let m = 0; m < 6; m++) {
    const baseDate = new Date();
    baseDate.setDate(1);
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

      const count = isWeekend ? randomBetween(4, 10) : randomBetween(8, 20);

      for (let i = 0; i < count; i++) {
        const apt = generateAppointment({
          date,
          services,
          employees,
          clients,
          companyId: company.id,
          isFuture: false,
        });

        if (apt) monthAppointments.push(apt);
      }
    }

    appointments.push(...monthAppointments);
  }

  await prisma.appointment.createMany({
    data: appointments,
  });

  console.log("🌱 Seed atualizado com Employee + serviços + agendamentos!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());