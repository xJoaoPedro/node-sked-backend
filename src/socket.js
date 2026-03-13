import { Server } from "socket.io";

let io;

const socketServer = {
  init: (server) => {
    io = new Server(server);

    io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Token ausente"));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        socket.user = decoded;

        next();
      } catch {
        next(new Error("Token inválido"));
      }
    });

    return io;
  },

  getIO: () => {
    if (!io) throw new Error("Socket.io não inicializado");
    return io;
  },
};

export default socketServer;
