import { ensureSuppliersTable, getSql, type SupplierRow } from "./_db.js";

// Removemos 'runtime: edge' para usar Node.js Serverless padrão
// export const config = { runtime: "edge" };

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

// Tipagens genéricas para evitar conflitos
interface ApiRequest {
  method?: string;
  body?: any;
  query?: Record<string, string | string[]>;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    await ensureSuppliersTable();
    const sql = getSql();

    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, name, email, phone, created_at FROM suppliers ORDER BY created_at DESC
      `;
      res.status(200).json(rows.map((row) => toSupplier(row as SupplierRow)));
      return;
    }

    if (req.method === "POST") {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const supplier = parseSupplier(body);
      
      if (!supplier || !supplier.name) {
        res.status(400).json({ error: "Payload inválido" });
        return;
      }
      const rows = await sql`
        INSERT INTO suppliers (id, name, email, phone)
        VALUES (${supplier.id}, ${supplier.name}, ${supplier.email || null}, ${supplier.phone || null})
        RETURNING id, name, email, phone, created_at
      `;
      res.status(201).json(toSupplier(rows[0] as SupplierRow));
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
