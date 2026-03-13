import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureSuppliersTable, getPool, type SupplierRow } from "./_db.js";

export const config = { runtime: "nodejs" };

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

function toSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    createdAt: row.created_at,
  };
}

function parseSupplier(body: unknown): Omit<Supplier, "createdAt"> | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const payload = body as Record<string, unknown>;
  if (typeof payload.id !== "string" || typeof payload.name !== "string") {
    return null;
  }
  return {
    id: payload.id,
    name: payload.name.trim(),
    email: typeof payload.email === "string" ? payload.email.trim() : "",
    phone: typeof payload.phone === "string" ? payload.phone.trim() : "",
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    await ensureSuppliersTable();
    const pool = getPool();

    if (req.method === "GET") {
      const result = await pool.query<SupplierRow>(
        "SELECT id, name, email, phone, created_at FROM suppliers ORDER BY created_at DESC"
      );
      res.status(200).json(result.rows.map(toSupplier));
      return;
    }

    if (req.method === "POST") {
      const supplier = parseSupplier(req.body);
      if (!supplier || !supplier.name) {
        res.status(400).json({ error: "Payload inválido" });
        return;
      }
      const result = await pool.query<SupplierRow>(
        `INSERT INTO suppliers (id, name, email, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, phone, created_at`,
        [supplier.id, supplier.name, supplier.email || null, supplier.phone || null]
      );
      res.status(201).json(toSupplier(result.rows[0]));
      return;
    }

    res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    res.status(500).json({
      error: "Erro interno",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
