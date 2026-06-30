import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const COMPANY_EMAIL = "teste@teste.com";
const COMPANY_PHONE = "51999999999";
const COMPANY_CNPJ = "11111111000191";

const USER_SEEDS = [
  {
    name: "Gerente Teste",
    email: "gerente@teste.com",
    phone: "51999999991",
    role: "MANAGER",
  },
  {
    name: "Profissional 1",
    email: "prof1@teste.com",
    phone: "51999999992",
    role: "EMPLOYEE",
  },
  {
    name: "Profissional 2",
    email: "prof2@teste.com",
    phone: "51999999993",
    role: "EMPLOYEE",
  },
  {
    name: "Profissional 3",
    email: "prof3@teste.com",
    phone: "51999999994",
    role: "EMPLOYEE",
  },
];

const PRODUCT_NAMES = {
  HAIR: ["Shampoo Profissional", "Condicionador", "Pomada Modeladora"],
  BEARD: ["Oleo de Barba", "Balm", "Shampoo Barba"],
  AESTHETIC: ["Creme Facial", "Serum", "Hidratante"],
  BEAUTY: ["Base", "Primer", "Fixador"],
  OTHER: ["Produto Generico"],
};

const TIME_SLOTS = Array.from({ length: (22 - 6) * 2 }, (_, i) => {
  const hour = 6 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  return { hour, minute };
});

const SHIFTS = {
  MORNING: { start: 6, end: 12 },
  AFTERNOON: { start: 12, end: 18 },
  NIGHT: { start: 18, end: 22 },
  FULL: { start: 9, end: 19 },
};

const CANCEL_REASONS = [
  "NO_SHOW",
  "SCHEDULE_CONFLICT",
  "ILLNESS",
  "EMERGENCY",
  "PROFESSIONAL_UNAVAILABLE",
  "OTHER",
];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomCommission(min = 30, max = 50) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function getRandomProduct(category) {
  return getRandomItem(PRODUCT_NAMES[category] || PRODUCT_NAMES.OTHER);
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

function getDailyActivityProfile(date, now) {
  const weekDay = date.getDay();
  const isSunday = weekDay === 0;
  const isSaturday = weekDay === 6;
  const isToday = getDateKey(date) === getDateKey(now);
  const isFuture = date > now;

  if (isSunday) {
    return {
      shouldOpen: Math.random() < 0.08,
      minAppointments: 1,
      maxAppointments: 3,
    };
  }

  if (isSaturday) {
    return {
      shouldOpen: true,
      minAppointments: isFuture ? 8 : 10,
      maxAppointments: isFuture ? 14 : 18,
    };
  }

  if (isToday) {
    return {
      shouldOpen: true,
      minAppointments: 6,
      maxAppointments: 11,
    };
  }

  return {
    shouldOpen: Math.random() < (isFuture ? 0.82 : 0.9),
    minAppointments: isFuture ? 5 : 7,
    maxAppointments: isFuture ? 10 : 15,
  };
}

function getWeightedPaymentMethod() {
  const rand = Math.random();

  if (rand < 0.5) return "PIX";
  if (rand < 0.75) return "DEBIT";
  if (rand < 0.9) return "CREDIT";
  return "CASH";
}

function selectClientForAppointment({ recurringClients, oneTimeClients, appointmentCounts }) {
  const availableOneTimeClients = oneTimeClients.filter(
    (client) => (appointmentCounts.get(client.id) || 0) === 0,
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

function timeValue(hour, minute = 0) {
  return new Date(`1970-01-01T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
}

function dateAt(baseDate, offsetDays, hour, minute = 0) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function buildCustomerSeedData() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  return Array.from({ length: 80 }).map((_, i) => {
    const createdAt = i < 22
      ? randomDateBetween(thirtyDaysAgo, now)
      : randomDateBetween(sixMonthsAgo, thirtyDaysAgo);

    return {
      name: `Cliente Teste ${i + 1}`,
      phone: `51987${String(i + 1).padStart(6, "0")}`,
      createdAt,
    };
  });
}

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
  for (let attempt = 0; attempt < 25; attempt += 1) {
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
      status = Math.random() < 0.82 ? "CONFIRMED" : "PENDING";
    } else {
      const rand = Math.random();

      if (rand < 0.82) {
        status = "COMPLETED";
        payment_method = getWeightedPaymentMethod();
      } else if (rand < 0.9) {
        status = "CANCELED";
        cancel_reason = getRandomItem(CANCEL_REASONS);
      } else if (rand < 0.96) {
        status = "NO_SHOW";
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

async function cleanupCompanyData(companyId, customerPhones) {
  await prisma.revenueTransaction.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.botInteraction.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.appointment.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.scheduleBlock.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.scheduleOpening.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.companyCustomer.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.product.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.signature.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.address.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.service.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.employee.deleteMany({
    where: { company_id: companyId },
  });

  await prisma.customer.deleteMany({
    where: {
      phone: {
        in: customerPhones,
      },
    },
  });
}

async function main() {
  const password = await bcrypt.hash("12345aA!", 10);
  const customerSeedData = buildCustomerSeedData();
  const userEmails = USER_SEEDS.map((user) => user.email);
  const customerPhones = customerSeedData.map((customer) => customer.phone);

  const existingCompany = await prisma.company.findUnique({
    where: { email: COMPANY_EMAIL },
    select: { id: true },
  });

  if (existingCompany) {
    await cleanupCompanyData(existingCompany.id, customerPhones);
  } else {
    await prisma.customer.deleteMany({
      where: {
        phone: {
          in: customerPhones,
        },
      },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: userEmails,
      },
    },
  });

  const company = await prisma.company.upsert({
    where: {
      email: COMPANY_EMAIL,
    },
    update: {
      legal_name: "Teste LTDA",
      fantasy_name: "Teste Barber",
      cnpj: COMPANY_CNPJ,
      password,
      phone: COMPANY_PHONE,
      photo: "https://loremflickr.com/400/300/barbershop",
      website: "https://teste.com",
      accepted_payment_methods: ["PIX", "CREDIT", "DEBIT", "CASH"],
      amenities: ["WIFI", "PARKING", "ACCEPTS_CHILDREN", "PET_FRIENDLY"],
      low_stock_threshold: 2,
      plan: "PRO",
      status: "APPROVED",
      approved: true,
      approve_date: new Date(),
    },
    create: {
      legal_name: "Teste LTDA",
      fantasy_name: "Teste Barber",
      cnpj: COMPANY_CNPJ,
      email: COMPANY_EMAIL,
      password,
      phone: COMPANY_PHONE,
      photo: "https://loremflickr.com/400/300/barbershop",
      website: "https://teste.com",
      accepted_payment_methods: ["PIX", "CREDIT", "DEBIT", "CASH"],
      amenities: ["WIFI", "PARKING", "ACCEPTS_CHILDREN", "PET_FRIENDLY"],
      low_stock_threshold: 2,
      plan: "PRO",
      status: "APPROVED",
      approved: true,
      approve_date: new Date(),
    },
  });

  await prisma.address.create({
    data: {
      company_id: company.id,
      cep: "90000000",
      street: "Rua Teste",
      number: "123",
      complement: "Sala 02",
      neighborhood: "Centro",
      city: "Porto Alegre",
      state: "RS",
    },
  });

  await prisma.signature.create({
    data: {
      company_id: company.id,
      plan: "PRO",
      status: "ACTIVE",
      start_date: new Date("2026-06-01T00:00:00.000Z"),
      renovation_date: new Date("2026-07-01T00:00:00.000Z"),
      paid: true,
    },
  });

  const employees = [];
  const shifts = ["FULL", "MORNING", "AFTERNOON", "NIGHT"];
  const employeeShiftMap = new Map();

  for (const userSeed of USER_SEEDS) {
    const user = await prisma.user.create({
      data: {
        name: userSeed.name,
        email: userSeed.email,
        password,
        phone: userSeed.phone,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: userSeed.role,
      },
    });

    employees.push(employee);
  }

  for (let i = 0; i < employees.length; i += 1) {
    const employee = employees[i];
    const shiftKey = shifts[i % shifts.length];
    const shift = SHIFTS[shiftKey];

    employeeShiftMap.set(employee.id, shift);

    for (let weekDay = 1; weekDay <= 6; weekDay += 1) {
      await prisma.scheduleOpening.create({
        data: {
          company_id: company.id,
          employee_id: employee.id,
          week_day: weekDay,
          start_time: timeValue(shift.start),
          end_time: timeValue(shift.end),
        },
      });
    }
  }

  await prisma.scheduleBlock.createMany({
    data: [
      {
        company_id: company.id,
        employee_id: employees[0].id,
        start_time: dateAt(new Date(), 1, 12, 0),
        end_time: dateAt(new Date(), 1, 13, 0),
        reason: "Almoco externo",
      },
      {
        company_id: company.id,
        employee_id: employees[1].id,
        start_time: dateAt(new Date(), 2, 9, 0),
        end_time: dateAt(new Date(), 2, 10, 30),
        reason: "Treinamento",
      },
      {
        company_id: company.id,
        employee_id: employees[2].id,
        start_time: dateAt(new Date(), 3, 15, 0),
        end_time: dateAt(new Date(), 3, 16, 0),
        reason: "Compromisso pessoal",
      },
    ],
  });

  const services = await Promise.all([
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Corte",
        category: "HAIR",
        description: "Corte tradicional masculino",
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
        description: "Acabamento e modelagem",
        duration_minutes: 30,
        price: 30,
        commission: 30,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Combo Corte + Barba",
        category: "HAIR",
        description: "Pacote completo",
        duration_minutes: 60,
        price: 70,
        commission: 45,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Hidratacao",
        category: "BEAUTY",
        description: "Tratamento capilar",
        duration_minutes: 45,
        price: 65,
        commission: getRandomCommission(),
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Sobrancelha",
        category: "BEAUTY",
        description: "Design simples",
        duration_minutes: 20,
        price: 25,
        commission: getRandomCommission(),
      },
    }),
  ]);

  const serviceEmployeeMap = new Map();

  for (const employee of employees) {
    for (const service of services) {
      if (Math.random() > 0.25) {
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
      const fallbackEmployees = employees.slice(0, randomBetween(1, employees.length));

      for (const employee of fallbackEmployees) {
        await prisma.employeeService.create({
          data: {
            employee_id: employee.id,
            service_id: service.id,
          },
        });
      }

      serviceEmployeeMap.set(service.id, fallbackEmployees);
    }
  }

  const productCategories = ["HAIR", "BEARD", "AESTHETIC", "BEAUTY"];

  await Promise.all(
    productCategories.flatMap((category) =>
      Array.from({ length: 2 }).map(() =>
        prisma.product.create({
          data: {
            company_id: company.id,
            name: getRandomProduct(category),
            category,
            quantity: randomBetween(0, 50),
            cost_price: Number((Math.random() * 20 + 5).toFixed(2)),
          },
        }),
      ),
    ),
  );

  const clients = [];

  for (const customerSeed of customerSeedData) {
    const customer = await prisma.customer.create({
      data: {
        name: customerSeed.name,
        phone: customerSeed.phone,
        created_at: customerSeed.createdAt,
        updated_at: customerSeed.createdAt,
      },
    });

    await prisma.companyCustomer.create({
      data: {
        company_id: company.id,
        customer_id: customer.id,
        created_at: customerSeed.createdAt,
        updated_at: customerSeed.createdAt,
      },
    });

    clients.push(customer);
  }

  const recurringClients = clients.slice(0, 24);
  const oneTimeClients = clients.slice(24);
  const appointmentCounts = new Map();
  const appointments = [];
  const employeeDayAppointments = new Map();
  const today = new Date();

  const seedStartDate = new Date(today);
  seedStartDate.setMonth(seedStartDate.getMonth() - 5);
  seedStartDate.setDate(1);
  seedStartDate.setHours(0, 0, 0, 0);

  const seedEndDate = new Date(today);
  seedEndDate.setDate(seedEndDate.getDate() + 21);
  seedEndDate.setHours(0, 0, 0, 0);

  for (
    const date = new Date(seedStartDate);
    date <= seedEndDate;
    date.setDate(date.getDate() + 1)
  ) {
    const currentDate = new Date(date);
    const { shouldOpen, minAppointments, maxAppointments } = getDailyActivityProfile(
      currentDate,
      today,
    );

    if (!shouldOpen) continue;

    const count = randomBetween(minAppointments, maxAppointments);
    const isFuture = currentDate > today;

    for (let i = 0; i < count; i += 1) {
      const client = selectClientForAppointment({
        recurringClients,
        oneTimeClients,
        appointmentCounts,
      });

      const appointment = generateAppointment({
        date: currentDate,
        services,
        employees,
        client,
        companyId: company.id,
        isFuture,
        employeeShiftMap,
        serviceEmployeeMap,
        employeeDayAppointments,
      });

      if (appointment) appointments.push(appointment);
    }
  }

  await prisma.appointment.createMany({
    data: appointments,
  });

  console.log(
    `Seed PDS completo para ${COMPANY_EMAIL}: ${clients.length} clientes e ${appointments.length} agendamentos.`,
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
