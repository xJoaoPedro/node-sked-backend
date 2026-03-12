import { Server } from "socket.io";

let io;

const socketServer = {
  init: (server) => {
    io = new Server(server);
    return io;
  },

  getIO: () => {
    if (!io) throw new Error("Socket.io não inicializado");
    return io;
  }
};

export default socketServer;