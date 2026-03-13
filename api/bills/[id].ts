import { ensureBillsTable, getSql, type BillRow } from "../_db.js";

// export const config = { runtime: "edge" };

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
  body?: any;
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

// Helper to validate and parse full bill update
function parseBillUpdate(body: unknown): Partial<Bill> | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const payload = body as Record<string, unknown>;
  
  // Basic validation
  if (
    typeof payload.vendor !== "string" ||
    typeof payload.description !== "string" ||
    typeof payload.category !== "string"
  ) {
    return null;
  }

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount)) return null;

  // Validate status if present
  let status: BillStatus | undefined;
  if (typeof payload.status === "string" && validStatus.has(payload.status as BillStatus)) {
    status = payload.status as BillStatus;
  } else if (payload.status) {
    return null; // Invalid status provided
  }

  // Validate dueDate (expect ISO or YYYY-MM-DD)
  let dueDate = "";
  if (typeof payload.dueDate === "string") {
     dueDate = payload.dueDate;
  } else {
    return null;
  }

  return {
    vendor: payload.vendor,
    description: payload.description,
    amount,
    dueDate,
    status,
    category: payload.category
  };
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

    // PATCH can be used for status update OR full update depending on payload
    // But for clarity, we'll keep PATCH for status and use PUT for full update, 
    // or just handle both in PUT/PATCH.
    // The user requirement implies editing the bill details.
    
    if (req.method === "PUT") {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const updates = parseBillUpdate(body);

      if (!updates) {
        res.status(400).json({ error: "Dados inválidos para atualização" });
        return;
      }

      // We need to ensure status is present, or default to current? 
      // Usually PUT replaces the resource. We'll assume the frontend sends all fields.
      
      const rows = await sql`
        UPDATE bills
        SET 
          vendor = ${updates.vendor}, 
          description = ${updates.description}, 
          amount = ${updates.amount}, 
          due_date = ${updates.dueDate}, 
          status = ${updates.status}, 
          category = ${updates.category}
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

    if (req.method === "PATCH") {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const status = getStatus(body);
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
    console.error("API Error:", error);
    res.status(500).json({
      error: "Erro interno",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
