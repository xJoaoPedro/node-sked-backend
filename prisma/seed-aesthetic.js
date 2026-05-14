import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "@prisma/client";
import bcrypt from "bcrypt";

const { PrismaClient } = pkg;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateBetween(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();

  return new Date(startTime + Math.random() * (endTime - startTime));
}

const PRODUCT_NAMES = {
  AESTHETIC: [
    "Serum Vitamina C",
    "Mascara Calmante",
    "Protetor Solar Facial FPS 60",
    "Gel de Limpeza Facial",
  ],
  BEAUTY: [
    "Henna para Sobrancelhas",
    "Fixador de Maquiagem",
    "Agua Micelar",
    "Primer Iluminador",
  ],
  HEALTH: [
    "Creme Pos-Procedimento",
    "Gel Condutor",
    "Argila Branca",
    "Locao Antisseptica",
  ],
  MASSAGE: [
    "Oleo Corporal Relaxante",
    "Creme de Massagem Redutor",
    "Fluido Drenante",
    "Esfoliante Corporal",
  ],
  OTHER: ["Produto Genérico"],
};

function getRandomProduct(category) {
  return getRandomItem(PRODUCT_NAMES[category] || PRODUCT_NAMES.OTHER);
}

const TIME_SLOTS = Array.from({ length: (21 - 8) * 2 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  return { hour, minute };
});

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
  const lateMorningSlots = slots.filter((slot) => slot.hour >= 10 && slot.hour <= 12);
  const afternoonSlots = slots.filter((slot) => slot.hour >= 14 && slot.hour <= 18);
  const rand = Math.random();

  if (rand < 0.35 && lateMorningSlots.length > 0) return getRandomItem(lateMorningSlots);
  if (rand < 0.8 && afternoonSlots.length > 0) return getRandomItem(afternoonSlots);
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
      shouldOpen: false,
      minAppointments: 0,
      maxAppointments: 0,
    };
  }

  if (isSaturday) {
    return {
      shouldOpen: true,
      minAppointments: isFuture ? 6 : 8,
      maxAppointments: isFuture ? 10 : 13,
    };
  }

  if (isToday) {
    return {
      shouldOpen: true,
      minAppointments: 5,
      maxAppointments: 9,
    };
  }

  return {
    shouldOpen: Math.random() < (isFuture ? 0.86 : 0.93),
    minAppointments: isFuture ? 4 : 6,
    maxAppointments: isFuture ? 9 : 12,
  };
}

const CANCEL_REASONS = [
  "NO_SHOW",
  "SCHEDULE_CONFLICT",
  "ILLNESS",
  "EMERGENCY",
  "PROFESSIONAL_UNAVAILABLE",
  "OTHER",
];

const APPOINTMENT_OBSERVATIONS = [
  "Primeira avaliacao",
  "Retorno de procedimento",
  "Cliente prefere atendimento em sala reservada",
  "Pele sensivel, usar produtos suaves",
  "Solicitou orientacoes de home care",
  "Sessao de manutencao",
];

function getWeightedPaymentMethod() {
  const rand = Math.random();

  if (rand < 0.45) return "PIX";
  if (rand < 0.75) return "CREDIT";
  if (rand < 0.92) return "DEBIT";
  return "CASH";
}

function selectClientForAppointment({ recurringClients, oneTimeClients, appointmentCounts }) {
  const availableOneTimeClients = oneTimeClients.filter(
    (client) => (appointmentCounts.get(client.id) || 0) === 0,
  );

  const shouldUseOneTimeClient =
    availableOneTimeClients.length > 0 && Math.random() < 0.28;

  const client = shouldUseOneTimeClient
    ? getRandomItem(availableOneTimeClients)
    : getRandomItem(recurringClients);

  appointmentCounts.set(client.id, (appointmentCounts.get(client.id) || 0) + 1);

  return client;
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
      status = Math.random() < 0.78 ? "CONFIRMED" : "PENDING";
    } else {
      const rand = Math.random();

      if (rand < 0.8) {
        status = "COMPLETED";
        payment_method = getWeightedPaymentMethod();
      } else if (rand < 0.89) {
        status = "CANCELED";
        cancel_reason = getRandomItem(CANCEL_REASONS);
      } else if (rand < 0.95) {
        status = "NO_SHOW";
      } else {
        status = "CONFIRMED";
      }
    }

    const observations =
      Math.random() < 0.55 ? getRandomItem(APPOINTMENT_OBSERVATIONS) : null;

    const appointment = {
      company_id: companyId,
      service_id: service.id,
      employee_id: employee.id,
      client_id: client.id,
      start_time: start,
      end_time: end,
      observations,
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

async function main() {
  const password = await bcrypt.hash("123456", 10);
  const employeeSeedUsers = [
    {
      name: "Juliana Martins",
      email: "juliana@luminaestetica.com",
      phone: "51999999111",
    },
    {
      name: "Carla Azevedo",
      email: "carla@luminaestetica.com",
      phone: "51999999112",
    },
    {
      name: "Renata Silveira",
      email: "renata@luminaestetica.com",
      phone: "51999999113",
    },
  ];

  const company = await prisma.company.create({
    data: {
      legal_name: "Lumina Estetica Avancada LTDA",
      fantasy_name: "Lumina Clinica Estetica",
      cnpj: "48765432000188",
      email: "contato@luminaestetica.com",
      password,
      phone: "51998557211",
      photo: "https://loremflickr.com/400/300/aesthetic-clinic",
      website: "https://luminaestetica.com",
      accepted_payment_methods: ["PIX", "CREDIT", "DEBIT", "CASH"],
      amenities: ["WIFI", "PARKING", "ACCESSIBILITY", "ACCEPTS_AUTISTIC"],
      low_stock_threshold: 4,
      status: "APPROVED",
    },
  });

  await prisma.user.create({
    data: {
      name: "Admin Lumina",
      email: "contato@luminaestetica.com",
      password,
      phone: "51998557211",
    },
  });

  const employees = [];

  for (const employeeSeedUser of employeeSeedUsers) {
    const user = await prisma.user.create({
      data: {
        name: employeeSeedUser.name,
        email: employeeSeedUser.email,
        password,
        phone: employeeSeedUser.phone,
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

  const SHIFTS = [
    { start: 9, end: 17 },
    { start: 10, end: 18 },
    { start: 11, end: 20 },
  ];
  const employeeShiftMap = new Map();

  for (let i = 0; i < employees.length; i++) {
    const employee = employees[i];
    const shift = SHIFTS[i % SHIFTS.length];
    employeeShiftMap.set(employee.id, shift);

    for (let weekDay = 1; weekDay <= 6; weekDay++) {
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

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const customerFirstNames = [
    "Ana",
    "Beatriz",
    "Camila",
    "Daniela",
    "Eduarda",
    "Fernanda",
    "Gabriela",
    "Helena",
    "Isabela",
    "Juliana",
    "Larissa",
    "Mariana",
    "Natasha",
    "Patricia",
    "Rafaela",
    "Sabrina",
    "Tatiane",
    "Vanessa",
  ];
  const customerLastNames = [
    "Silva",
    "Souza",
    "Oliveira",
    "Costa",
    "Pereira",
    "Rodrigues",
    "Almeida",
    "Fernandes",
    "Gomes",
    "Martins",
  ];

  const customerSeedData = Array.from({ length: 72 }).map((_, i) => {
    const createdAt = i < 20
      ? randomDateBetween(thirtyDaysAgo, now)
      : randomDateBetween(sixMonthsAgo, thirtyDaysAgo);

    return {
      name: `${getRandomItem(customerFirstNames)} ${getRandomItem(customerLastNames)}`,
      phone: `51987${String(i + 1).padStart(6, "0")}`,
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
      }),
    ),
  );

  await prisma.companyCustomer.createMany({
    data: clients.map((client, index) => ({
      company_id: company.id,
      customer_id: client.id,
      created_at: customerSeedData[index].createdAt,
      updated_at: customerSeedData[index].createdAt,
    })),
  });

  const recurringClients = clients.slice(0, 26);
  const oneTimeClients = clients.slice(26);
  const appointmentCounts = new Map();

  const services = await Promise.all([
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Limpeza de Pele Premium",
        category: "AESTHETIC",
        description: "Higienizacao profunda com extracao e mascara calmante",
        duration_minutes: 90,
        price: 180,
        commission: 35,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Drenagem Linfatica",
        category: "MASSAGE",
        description: "Sessao corporal para reducao de liquidos e bem-estar",
        duration_minutes: 60,
        price: 140,
        commission: 32,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Peeling Quimico",
        category: "AESTHETIC",
        description: "Procedimento para renovacao e uniformizacao da pele",
        duration_minutes: 60,
        price: 220,
        commission: 30,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Design de Sobrancelhas",
        category: "BEAUTY",
        description: "Modelagem personalizada com acabamento",
        duration_minutes: 45,
        price: 55,
        commission: 40,
      },
    }),
    prisma.service.create({
      data: {
        company_id: company.id,
        name: "Depilacao a Laser - Axilas",
        category: "AESTHETIC",
        description: "Sessao avulsa de depilacao a laser",
        duration_minutes: 30,
        price: 120,
        commission: 28,
      },
    }),
  ]);

  const serviceAssignments = [
    [0, 1, 3],
    [0, 2, 4],
    [1, 2, 3, 4],
  ];
  const serviceEmployeeMap = new Map();

  for (let employeeIndex = 0; employeeIndex < employees.length; employeeIndex++) {
    const employee = employees[employeeIndex];
    const assignedServiceIndexes = serviceAssignments[employeeIndex] ?? [];

    for (const serviceIndex of assignedServiceIndexes) {
      const service = services[serviceIndex];

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

  for (const service of services) {
    if (!serviceEmployeeMap.has(service.id)) {
      serviceEmployeeMap.set(service.id, employees);
    }
  }

  const productCategories = ["AESTHETIC", "BEAUTY", "HEALTH", "MASSAGE"];

  await Promise.all(
    productCategories.flatMap((category) =>
      Array.from({ length: 3 }).map(() =>
        prisma.product.create({
          data: {
            company_id: company.id,
            name: getRandomProduct(category),
            category,
            quantity: randomBetween(3, 20),
            cost_price: Number((Math.random() * 70 + 15).toFixed(2)),
          },
        }),
      ),
    ),
  );

  const appointments = [];
  const employeeDayAppointments = new Map();
  const today = now;

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

    for (let i = 0; i < count; i++) {
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

  console.log("Seed de clinica estetica concluido!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
