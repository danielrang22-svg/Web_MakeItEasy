import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    
    // Instrucción para destruir la sesión JWT del navegador.
    response.cookies.delete("mie-auth");
    response.cookies.delete("mie-role");
    
    console.log(`[AUDIT] ${new Date().toISOString()} | Sesión Cerrada | User IP: ${request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "Desconocida"}`);
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Error procesando logout" }, { status: 500 });
  }
}
