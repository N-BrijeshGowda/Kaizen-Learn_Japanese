// Connection settings shared by the app (src/lib/db.ts) and the scripts (prisma/seed.ts, prisma/make-admin.ts).
// Deliberately free of "server-only" so tsx scripts can import it.

/**
 * Turns DATABASE_URL into mariadb pool options.
 * TLS is switched on when the URL carries ssl-mode / sslaccept (Aiven, TiDB and most hosted MySQL need it) or
 * DATABASE_SSL=true. With DATABASE_CA (the provider's CA certificate, PEM text) the server is verified;
 * without it the connection is still encrypted but the certificate is not checked.
 */
export function mariadbConfig(connectionLimit: number) {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const url = new URL(raw);

  const sslParam = url.searchParams.get("ssl-mode") ?? url.searchParams.get("sslmode") ?? url.searchParams.get("sslaccept");
  const wantsSsl = process.env.DATABASE_SSL === "true" || (sslParam !== null && sslParam.toUpperCase() !== "DISABLED");
  const ca = process.env.DATABASE_CA?.replace(/\n/g, "\n").trim();

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit,
    // Hosted free databases close idle connections; let the pool drop and reopen them quietly.
    idleTimeout: 60,
    minimumIdle: 1,
    ...(wantsSsl ? { ssl: ca ? { ca } : { rejectUnauthorized: false } } : {}),
  };
}
