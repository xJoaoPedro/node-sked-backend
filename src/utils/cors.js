function normalizeOrigin(value = "") {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function getAllowedCorsOrigins() {
  const rawValue = process.env.CORS_URL || "";

  return rawValue
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
}

export function isCorsOriginAllowed(origin, allowedOrigins = getAllowedCorsOrigins()) {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);

  return allowedOrigins.includes(normalizedOrigin);
}

export function buildCorsOptions() {
  const allowedOrigins = getAllowedCorsOrigins();

  return {
    origin(origin, callback) {
      if (isCorsOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} nao permitida pelo CORS.`));
    },
    credentials: true,
  };
}
