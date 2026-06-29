import {
  AppointmentConflictError,
  AppointmentService,
} from "../services/appointment.service.js";
import {
  createAppointmentValidator,
  updateAppointmentValidator,
} from "../validators/appointment.validator.js";

const service = new AppointmentService();
const getRealtimeOptions = (req) => ({
  excludedSocketId: req.headers["x-socket-id"],
});

const getEmployeeScope = (req) => {
  const isEmployeeSession =
    req.user?.auth_type === "user" && req.user?.role === "EMPLOYEE";

  if (!isEmployeeSession) return {};

  return {
    employeeId: Number(req.user?.employee_id || 0) || null,
  };
};

const canAccessAppointment = (req, appointment) => {
  const employeeId = getEmployeeScope(req).employeeId;

  if (!employeeId) return true;

  return Number(appointment?.employee_id) === employeeId;
};

export default class AppointmentController {
  async findAll(req, res) {
    const appointments = await service.findAll();

    return res.status(200).json({
      message: "Consulta realizada com sucesso!",
      data: appointments,
    });
  }

  async findOne(req, res) {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const appointment = await service.findOne(id);

    if (!appointment || !canAccessAppointment(req, appointment)) {
      return res.status(404).json({
        message: "Agendamento não encontrado",
      });
    }

    res.status(200).json({
      message: "Agendamento encontrado com sucesso!",
      data: appointment,
    });
  }

  async getAppointmentsByDate(req, res) {
    const id = Number(req.params.id);
    const date = req.params.date;

    if (isNaN(id)) {
      return res.status(400).json({
        message: "ID inválido",
      });
    }

    const appointment = await service.getAppointmentsByDate(id, date, getEmployeeScope(req));

    if (!appointment) {
      return res.status(404).json({
        message: "Agendamentos não encontrados para a data informada",
      });
    }

    res.status(200).json({
      message: "Agendamentos encontrados com sucesso!",
      data: appointment,
    });
  }

  async create(req, res) {
    const parsed = createAppointmentValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: JSON.parse(parsed.error),
      });
    }

    let createdAppointment;
    const employeeScope = getEmployeeScope(req);

    try {
      createdAppointment = await service.create(
        {
          ...req.body,
          ...(employeeScope.employeeId ? { employee_id: employeeScope.employeeId } : {}),
        },
        getRealtimeOptions(req),
      );
    } catch (error) {
      if (error instanceof AppointmentConflictError) {
        return res.status(409).json({
          message: error.message,
        });
      }

      if (error instanceof Error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      throw error;
    }

    res.status(201).json({
      message: "Agendamento criado com sucesso!",
      data: createdAppointment,
    });
  }

  async update(req, res) {
    const parsed = updateAppointmentValidator.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: JSON.parse(parsed.error),
      });
    }

    let update;
    const employeeScope = getEmployeeScope(req);

    try {
      const currentAppointment = await service.findOne(Number(req.params.id));

      if (!currentAppointment || !canAccessAppointment(req, currentAppointment)) {
        return res.status(404).json({
          message: "Agendamento não encontrado",
        });
      }

      update = await service.update(
        Number(req.params.id),
        {
          ...parsed.data,
          ...(employeeScope.employeeId ? { employee_id: employeeScope.employeeId } : {}),
        },
        getRealtimeOptions(req),
      );
    } catch (error) {
      if (error instanceof AppointmentConflictError) {
        return res.status(409).json({
          message: error.message,
        });
      }

      if (error instanceof Error) {
        return res.status(400).json({
          message: error.message,
        });
      }

      throw error;
    }

    if (update)
      return res.status(200).json({
        message: "Agendamento atualizado com sucesso!",
        data: update,
      });
    else
      return res.status(404).json({
        message: "Agendamento não encontrado",
      });
  }

  async delete(req, res) {
    const currentAppointment = await service.findOne(Number(req.params.id));

    if (!currentAppointment || !canAccessAppointment(req, currentAppointment)) {
      return res.status(404).json({
        message: "Agendamento não encontrado",
      });
    }

    const deleted = await service.delete(Number(req.params.id), getRealtimeOptions(req));

    if (deleted) return res.status(204).json();
    else
      return res.status(404).json({
        message: "Agendamento não encontrado",
      });
  }
}
