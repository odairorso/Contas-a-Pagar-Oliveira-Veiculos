import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureBillsTable, getPool, type BillRow } from "./_db.js";

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

function toIsoDate(value: unknown): string | null {
  if (typeof value === "string") {
    const input = value.trim();
    const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    if (iso) {
      const [, year, month, day] = iso;
      return `${year}-${month}-${day}`;
    }
    const br = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) {
      const [, day, month, year] = br;
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return null;
}

function toBill(row: BillRow): Bill {
  return {
    id: row.id,
    vendor: row.vendor,
    description: row.description,
    amount: Number(row.amount),
    dueDate: toIsoDate(row.due_date) ?? "",
    status: row.status,
    category: row.category,
  };
}

function isBillStatus(value: unknown): value is BillStatus {
  return typeof value === "string" && validStatus.has(value as BillStatus);
}

function parseBill(body: unknown): Bill | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const amount = Number(payload.amount);
  const dueDate = toIsoDate(payload.dueDate);
  const status = payload.status;

  if (
    typeof payload.id !== "string" ||
    typeof payload.vendor !== "string" ||
    typeof payload.description !== "string" ||
    !Number.isFinite(amount) ||
    !dueDate ||
    !isBillStatus(status) ||
    typeof payload.category !== "string"
  ) {
    return null;
  }

  return {
    id: payload.id,
    vendor: payload.vendor,
    description: payload.description,
    amount,
    dueDate,
    status,
    category: payload.category,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    await ensureBillsTable();
    const pool = getPool();

    if (req.method === "GET") {
      const result = await pool.query<BillRow>(
        "SELECT id, vendor, description, amount, due_date, status, category FROM bills ORDER BY due_date ASC, created_at DESC"
      );
      res.status(200).json(result.rows.map(toBill));
      return;
    }

    if (req.method === "POST") {
      const bill = parseBill(req.body);
      if (!bill) {
        res.status(400).json({ error: "Payload inválido" });
        return;
      }

      const result = await pool.query<BillRow>(
        `INSERT INTO bills (id, vendor, description, amount, due_date, status, category)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, vendor, description, amount, due_date, status, category`,
        [bill.id, bill.vendor, bill.description, bill.amount, bill.dueDate, bill.status, bill.category]
      );

      res.status(201).json(toBill(result.rows[0]));
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
