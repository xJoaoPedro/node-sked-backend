import { Server } from "socket.io";
import { socketAuth } from "./utils/authenticators/socket.authenticator.js";

let io;

const getCompanyRoom = (companyId) => `company:${companyId}`;

const normalizeNotification = (eventName, payload = {}) => {
  const message =
    payload.message ||
    payload.description ||
    "Uma nova atualizacao em tempo real foi recebida.";

  return {
    id: payload.id || `${eventName}-${Date.now()}`,
    type: payload.type || "success",
    title: payload.title || "Nova notificacao",
    message,
    created_at: payload.created_at || new Date().toISOString(),
    isRead: false,
    ...payload,
  };
};

const emitWithOptionalExclusion = (operator, excludedSocketId, eventName, payload) => {
  if (excludedSocketId) {
    operator.except(excludedSocketId).emit(eventName, payload);
    return;
  }

  operator.emit(eventName, payload);
};

const socketServer = {
  init: (server) => {
    io = new Server(server, {
      cors: {
        origin: process.env.CORS_URL || "*",
        methods: ["GET", "POST", "PATCH", "DELETE"],
        credentials: true,
      },
    });

    io.use(socketAuth);

    io.on("connection", (socket) => {
      if (socket.companyId) {
        socket.join(getCompanyRoom(socket.companyId));
      }

      socket.on("company:join", ({ companyId } = {}) => {
        const normalizedCompanyId = Number(companyId || socket.companyId);

        if (!normalizedCompanyId) return;

        socket.join(getCompanyRoom(normalizedCompanyId));
        socket.companyId = normalizedCompanyId;
      });

      socket.emit("notification", {
        notification: normalizeNotification("notification", {
          id: `socket-connected-${socket.id}`,
          type: "success",
          title: "Tempo real conectado",
          message: "A conexao em tempo real com o servidor foi estabelecida.",
        }),
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) throw new Error("Socket.io nao inicializado");
    return io;
  },

  getCompanyRoom,

  emitToCompany: (companyId, eventName, payload = {}, options = {}) => {
    if (!io) throw new Error("Socket.io nao inicializado");

    const normalizedCompanyId = Number(companyId);

    if (!normalizedCompanyId) return;

    emitWithOptionalExclusion(
      io.to(getCompanyRoom(normalizedCompanyId)),
      options.excludedSocketId,
      eventName,
      payload,
    );
  },

  emitNotificationToCompany: (companyId, eventName, payload = {}, options = {}) => {
    const notificationPayload = {
      notification: normalizeNotification(eventName, payload),
      event: eventName,
      data: payload,
    };

    socketServer.emitToCompany(companyId, "notification", notificationPayload, options);
    socketServer.emitToCompany(companyId, eventName, payload, options);
  },
};

export default socketServer;
