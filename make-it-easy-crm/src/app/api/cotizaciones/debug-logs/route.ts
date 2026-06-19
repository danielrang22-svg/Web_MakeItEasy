import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET(request: NextRequest) {
  try {
    // Obtener los logs de PM2 directamente del VPS
    const logs = execSync("pm2 logs mie-crm --lines 100 --no-colors").toString();
    return new NextResponse(logs, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
