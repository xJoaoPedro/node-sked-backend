import { Server } from "socket.io";
import { socketAuth } from "./utils/authenticators/socket.authenticator.js";

let io;

const socketServer = {
  init: (server) => {
    io = new Server(server);

    io.use(socketAuth);

    return io;
  },

  getIO: () => {
    if (!io) throw new Error("Socket.io não inicializado");
    return io;
  },
};

export default socketServer;
