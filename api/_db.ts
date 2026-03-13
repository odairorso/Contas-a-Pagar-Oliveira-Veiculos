import { neon } from "@neondatabase/serverless";
import process from "process";

// Interfaces para os tipos do banco de dados
export type BillStatus = "paid" | "pending" | "overdue" | "scheduled";

export interface BillRow {
  id: string;
  vendor: string;
  description: string;
  amount: number;
  due_date: string;
  status: BillStatus;
  category: string;
  created_at: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

// Helper para obter e limpar a URL do banco de dados
function getDatabaseUrl(): string {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!dbUrl) {
    throw new Error("DATABASE_URL não configurado nas variáveis de ambiente.");
  }

  // O driver HTTP do Neon (neon-serverless) não precisa de sslmode ou channel_binding
  // e pode falhar se eles estiverem presentes na query string.
  try {
    const url = new URL(dbUrl.trim());
    url.searchParams.delete("sslmode");
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    return dbUrl.trim();
  }
}

// Exporta a função para obter o cliente SQL (HTTP/Fetch)
// Isso substitui o Pool (WebSocket) para maior compatibilidade em Serverless
export function getSql() {
  const connectionString = getDatabaseUrl();
  return neon(connectionString);
}

// Funções para garantir a existência das tabelas (DDL)
export async function ensureBillsTable(): Promise<void> {
  const sql = getSql();
  try {
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
  } catch (error) {
    console.error("Erro ao criar tabela bills:", error);
    // Não relança o erro para não quebrar a requisição, mas loga
  }
}

export async function ensureSuppliersTable(): Promise<void> {
  const sql = getSql();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
  } catch (error) {
    console.error("Erro ao criar tabela suppliers:", error);
  }
}
