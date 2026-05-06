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

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function getWeightedTimeSlotFromSlots(slots) {
  const morningSlots = slots.filter((slot) => slot.hour >= 9 && slot.hour <= 12);
  const eveningSlots = slots.filter((slot) => slot.hour >= 17 && slot.hour <= 20);
  const rand = Math.random();

  if (rand < 0.4 && morningSlots.length > 0) return getRandomItem(morningSlots);
  if (rand < 0.7 && eveningSlots.length > 0) return getRandomItem(eveningSlots);
  return getRandomItem(slots);
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

function selectClientForAppointment({ recurringClients, oneTimeClients, appointmentCounts }) {
  const availableOneTimeClients = oneTimeClients.filter(
    (client) => (appointmentCounts.get(client.id) || 0) === 0
  );

  const shouldUseOneTimeClient =
    availableOneTimeClients.length > 0 && Math.random() < 0.35;

  const client = shouldUseOneTimeClient
    ? getRandomItem(availableOneTimeClients)
    : getRandomItem(recurringClients);

  appointmentCounts.set(client.id, (appointmentCounts.get(client.id) || 0) + 1);

  return client;
}

function randomDateBetween(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();

  return new Date(startTime + Math.random() * (endTime - startTime));
}

// ---------------------
// Appointment generator
// ---------------------
function generateAppointment({
  date,
  services,
  employees,
  client,
  companyId,
  isFuture,
  employeeShiftMap,
  serviceEmployeeMap,
  employeeDayAppointments,
}) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const service = getRandomItem(services);
    const eligibleEmployees = serviceEmployeeMap.get(service.id) ?? employees;
    const employee = getRandomItem(eligibleEmployees);
    const shift = employeeShiftMap.get(employee.id);

    if (!shift) continue;

    const availableSlots = TIME_SLOTS.filter((slot) => {
      const slotStartInMinutes = slot.hour * 60 + slot.minute;
      const slotEndInMinutes = slotStartInMinutes + service.duration_minutes;

      return (
        slotStartInMinutes >= shift.start * 60 &&
        slotEndInMinutes <= shift.end * 60
      );
    });

    if (availableSlots.length === 0) continue;

    const start = new Date(date);
    const slot = getWeightedTimeSlotFromSlots(availableSlots);

    start.setHours(slot.hour, slot.minute, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + service.duration_minutes);

    const dayKey = `${employee.id}:${getDateKey(date)}`;
    const existingAppointments = employeeDayAppointments.get(dayKey) ?? [];
    const hasConflict = existingAppointments.some((appointment) =>
      overlaps(start, end, appointment.start_time, appointment.end_time),
    );

    if (hasConflict) continue;

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

    const appointment = {
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

    existingAppointments.push(appointment);
    employeeDayAppointments.set(dayKey, existingAppointments);

    return appointment;
  }

  return null;
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
      phone: "51999999999",
      photo: "https://loremflickr.com/400/300/barber",
      accepted_payment_methods: ["PIX", "CREDIT", "DEBIT"],
      status: "APPROVED",
    },
  });

  // ADMIN
  const adminUser = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@empresa.com",
      password,
      phone: "51999999999",
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

  // 🔥 ADIÇÃO: ScheduleOpening
  const shifts = ["MORNING", "AFTERNOON", "NIGHT"];
  const employeeShiftMap = new Map();

  const SHIFTS = {
    MORNING: { start: 6, end: 12 },
    AFTERNOON: { start: 12, end: 18 },
    NIGHT: { start: 18, end: 22 },
  };

  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];
    const shiftKey = shifts[i % shifts.length];
    const shift = SHIFTS[shiftKey];
    employeeShiftMap.set(employee.id, shift);

    for (let weekDay = 1; weekDay <= 5; weekDay++) {
      await prisma.scheduleOpening.create({
        data: {
          company_id: company.id,
          employee_id: employee.id,
          week_day: weekDay,
          start_time: new Date(`1970-01-01T${String(shift.start).padStart(2, "0")}:00:00`),
          end_time: new Date(`1970-01-01T${String(shift.end).padStart(2, "0")}:00:00`),
        },
      });
    }
  }

  // CLIENTS
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const customerSeedData = Array.from({ length: 80 }).map((_, i) => {
    const createdAt = i < 22
      ? randomDateBetween(thirtyDaysAgo, now)
      : randomDateBetween(sixMonthsAgo, thirtyDaysAgo);

    return {
      name: `Cliente ${i + 1}`,
      phone: `51988${String(i + 1).padStart(6, "0")}`,
      createdAt,
    };
  });

  const clients = await Promise.all(
    customerSeedData.map((customer) =>
      prisma.customer.create({
        data: {
          name: customer.name,
          phone: customer.phone,
          created_at: customer.createdAt,
          updated_at: customer.createdAt,
        },
      })
    )
  );

  await prisma.companyCustomer.createMany({
    data: clients.map((client, index) => ({
      company_id: company.id,
      customer_id: client.id,
      created_at: customerSeedData[index].createdAt,
      updated_at: customerSeedData[index].createdAt,
    })),
  });

  const recurringClients = clients.slice(0, 24);
  const oneTimeClients = clients.slice(24);
  const appointmentCounts = new Map();

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

  // RELAÇÃO N:N
  const serviceEmployeeMap = new Map();

  for (const employee of employees) {
    for (const service of services) {
      if (Math.random() > 0.3) {
        await prisma.employeeService.create({
          data: {
            employee_id: employee.id,
            service_id: service.id,
          },
        });

        const employeeList = serviceEmployeeMap.get(service.id) ?? [];
        employeeList.push(employee);
        serviceEmployeeMap.set(service.id, employeeList);
      }
    }
  }

  for (const service of services) {
    if (!serviceEmployeeMap.has(service.id)) {
      serviceEmployeeMap.set(service.id, employees);
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
  const employeeDayAppointments = new Map();
  const today = now;

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
        const client = selectClientForAppointment({
          recurringClients,
          oneTimeClients,
          appointmentCounts,
        });

        const apt = generateAppointment({
          date,
          services,
          employees,
          client,
          companyId: company.id,
          isFuture: false,
          employeeShiftMap,
          serviceEmployeeMap,
          employeeDayAppointments,
        });

        if (apt) monthAppointments.push(apt);
      }
    }

    appointments.push(...monthAppointments);
  }

  await prisma.appointment.createMany({
    data: appointments,
  });

  console.log("🌱 Seed completo com ScheduleOpening!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
