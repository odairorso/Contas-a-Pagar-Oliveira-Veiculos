import { neon } from "@neondatabase/serverless";

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
  // Em ambiente Vercel Edge, process.env pode não estar disponível como módulo Node.
  // Vamos tentar acessar globalmente ou via import.meta.env se fosse Vite puro, mas em API Functions
  // o padrão é process.env ser injetado. Para evitar erro de "unsupported module process",
  // acessamos process.env sem importar o pacote 'process'.
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!dbUrl) {
    throw new Error("DATABASE_URL não configurado nas variáveis de ambiente da Vercel.");
  }

  return dbUrl.trim();
}

// Cliente SQL simples via HTTP (stateless, ideal para serverless/edge)
export function getSql() {
  return neon(getDatabaseUrl());
}

export async function ensureBillsTable(): Promise<void> {
  const sql = getSql();
  await sql`
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
  `;
}

export async function ensureSuppliersTable(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
}
