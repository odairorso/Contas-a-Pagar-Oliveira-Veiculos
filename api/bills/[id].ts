import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureBillsTable, getPool, type BillRow } from "../_db.js";

export const config = { runtime: "nodejs" };

type BillStatus = "paid" | "pending" | "overdue" | "scheduled";

interface Bill {
  id: string;
  vendor: string;
  description: string;
  amount: number;
  dueDate: string;
  status: BillStatus;
  category: string;
}

const validStatus = new Set<BillStatus>(["paid", "pending", "overdue", "scheduled"]);

function toBill(row: BillRow): Bill {
  return {
    id: row.id,
    vendor: row.vendor,
    description: row.description,
    amount: Number(row.amount),
    dueDate: row.due_date,
    status: row.status,
    category: row.category,
  };
}

function getId(req: VercelRequest): string | null {
  const raw = req.query.id;
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw) && raw[0]) {
    return raw[0];
  }
  return null;
}

function getStatus(body: unknown): BillStatus | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const status = (body as Record<string, unknown>).status;
  if (typeof status !== "string") {
    return null;
  }
  if (!validStatus.has(status as BillStatus)) {
    return null;
  }
  return status as BillStatus;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    await ensureBillsTable();
    const pool = getPool();
    const id = getId(req);

    if (!id) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    if (req.method === "PATCH") {
      const status = getStatus(req.body);
      if (!status) {
        res.status(400).json({ error: "Status inválido" });
        return;
      }

      const result = await pool.query<BillRow>(
        `UPDATE bills
         SET status = $1
         WHERE id = $2
         RETURNING id, vendor, description, amount, due_date, status, category`,
        [status, id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Conta não encontrada" });
        return;
      }

      res.status(200).json(toBill(result.rows[0]));
      return;
    }

    if (req.method === "DELETE") {
      const result = await pool.query("DELETE FROM bills WHERE id = $1", [id]);
      if (result.rowCount === 0) {
        res.status(404).json({ error: "Conta não encontrada" });
        return;
      }
      res.status(200).json({ ok: true });
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
