import { ensureBillsTable, getSql, type BillRow } from "./_db.js";

// Removemos 'runtime: edge' para usar Node.js Serverless padrão (mais estável com dependências)
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

// Usamos tipos genéricos para req/res para evitar conflitos de tipagem do Vercel
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    await ensureBillsTable();
    const sql = getSql();

    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, vendor, description, amount, due_date, status, category 
        FROM bills 
        ORDER BY due_date ASC, created_at DESC
      `;
      res.status(200).json(rows.map((row) => toBill(row as BillRow)));
      return;
    }

    if (req.method === "POST") {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // Batch insert logic
      if (Array.isArray(body)) {
        const bills = body.map(parseBill).filter((b): b is Bill => b !== null);
        
        if (bills.length === 0) {
          res.status(400).json({ error: "Nenhum item válido encontrado na lista" });
          return;
        }

        // Using Promise.all for batch insert since Neon HTTP driver supports concurrent requests
        const results = await Promise.all(
          bills.map(bill => 
            sql`
              INSERT INTO bills (id, vendor, description, amount, due_date, status, category)
              VALUES (${bill.id}, ${bill.vendor}, ${bill.description}, ${bill.amount}, ${bill.dueDate}, ${bill.status}, ${bill.category})
              RETURNING id, vendor, description, amount, due_date, status, category
            `
          )
        );
        
        const flatResults = results.map(r => toBill(r[0] as BillRow));
        res.status(201).json(flatResults);
        return;
      }

      // Single insert logic
      const bill = parseBill(body);
      
      if (!bill) {
        res.status(400).json({ error: "Payload inválido" });
        return;
      }

      const rows = await sql`
        INSERT INTO bills (id, vendor, description, amount, due_date, status, category)
        VALUES (${bill.id}, ${bill.vendor}, ${bill.description}, ${bill.amount}, ${bill.dueDate}, ${bill.status}, ${bill.category})
        RETURNING id, vendor, description, amount, due_date, status, category
      `;

      res.status(201).json(toBill(rows[0] as BillRow));
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
