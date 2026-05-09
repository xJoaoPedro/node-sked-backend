import jwt from "jsonwebtoken";

export function socketAuth(socket, next) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Token ausente"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;
    socket.companyId =
      Number(socket.handshake.auth.companyId) ||
      Number(decoded.company_id) ||
      Number(decoded.companyId) ||
      null;

    next();
  } catch {
    next(new Error("Token inválido SOCKET"));
  }
}
