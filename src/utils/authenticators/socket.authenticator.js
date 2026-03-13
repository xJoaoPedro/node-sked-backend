export function socketAuth(socket, next) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Token ausente"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;

    next();
  } catch {
    next(new Error("Token inválido SOCKET"));
  }
}
