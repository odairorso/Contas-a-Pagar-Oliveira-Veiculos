import { getSql } from "./_db.js";

export const config = { runtime: "edge" };

interface ApiRequest {
  method?: string;
}

interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const sql = getSql();
    const rows = await sql`SELECT NOW() as now, current_database() as db`;
    
    // Em Edge, process.env é limitado, mas vamos tentar mostrar chaves seguras
    // Se não for possível iterar process.env, retornamos lista vazia ou fixa
    let envKeys: string[] = [];
    try {
        // @ts-ignore
        envKeys = Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("POSTGRES"));
    } catch {
        envKeys = ["env_access_restricted_in_edge"];
    }

    res.status(200).json({
      success: true,
      data: rows[0],
      env_keys: envKeys
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      env_keys: []
    });
  }
}
