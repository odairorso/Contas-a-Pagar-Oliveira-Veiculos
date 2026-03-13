import { ensureBillsTable, getSql, type BillRow } from "../_db.js";

export const config = { runtime: "edge" };

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

interface ApiRequest {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[]>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
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

function getId(req: ApiRequest): string | null {
  const raw = req.query?.id;
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    await ensureBillsTable();
    const sql = getSql();
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

      const rows = await sql`
        UPDATE bills
        SET status = ${status}
        WHERE id = ${id}
        RETURNING id, vendor, description, amount, due_date, status, category
      `;

      if (rows.length === 0) {
        res.status(404).json({ error: "Conta não encontrada" });
        return;
      }

      res.status(200).json(toBill(rows[0] as BillRow));
      return;
    }

    if (req.method === "DELETE") {
      const rows = await sql`
        DELETE FROM bills WHERE id = ${id} RETURNING id
      `;
      if (rows.length === 0) {
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
