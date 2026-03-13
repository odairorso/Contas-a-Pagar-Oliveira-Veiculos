import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import process from "process";

// Configura o WebSocket para o driver Neon (necessário para ambientes serverless Node.js)
neonConfig.webSocketConstructor = ws;

type BillStatus = "paid" | "pending" | "overdue" | "scheduled";

export interface BillRow {
  id: string;
  vendor: string;
  description: string;
  amount: number;
  due_date: string;
  status: BillStatus;
  category: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

function getDatabaseUrl(): string {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!dbUrl) {
    throw new Error("DATABASE_URL não configurado nas variáveis de ambiente da Vercel.");
  }

  // O driver @neondatabase/serverless pode ter problemas com alguns parâmetros de query string extras
  // como sslmode=require. Vamos limpar esses parâmetros para evitar erros de conexão.
  try {
    const url = new URL(dbUrl.trim());
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return dbUrl.trim();
  }
}

// Cache do pool de conexões para reutilização entre invocações da função
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: true,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function ensureBillsTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      vendor TEXT NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      due_date DATE NOT NULL,
      status TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function ensureSuppliersTable(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}