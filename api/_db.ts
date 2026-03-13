import { Pool } from "pg";
import process from "process";

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
  const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!dbUrl) {
    throw new Error("DATABASE_URL não configurado nas variáveis de ambiente da Vercel.");
  }

  try {
    const parsed = new URL(dbUrl.trim());
    // Removemos channel_binding pois pode causar erros de handshake em alguns ambientes serverless
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return dbUrl.trim();
  }
}

export function getPool(): Pool {
  const runtime = globalThis as typeof globalThis & { __neonPool?: Pool };
  if (!runtime.__neonPool) {
    const connectionString = getDatabaseUrl();
    runtime.__neonPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10, // Limite de conexões para ambiente serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return runtime.__neonPool;
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
