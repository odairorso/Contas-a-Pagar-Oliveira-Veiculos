import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pool = getPool();
    const result = await pool.query("SELECT NOW() as now, current_database() as db");
    res.status(200).json({
      success: true,
      data: result.rows[0],
      env_keys: Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("POSTGRES"))
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      env_keys: Object.keys(process.env).filter(k => k.includes("DATABASE") || k.includes("POSTGRES"))
    });
  }
}
