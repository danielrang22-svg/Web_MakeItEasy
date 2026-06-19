import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sanitize } from '@/lib/validate';
import { execSync } from 'child_process';
import fs from 'fs';

export async function GET(request: NextRequest) {
  try {
    let output = "";
    
    // 1. Check Git active commit
    try {
      output += "=== GIT ACTIVE COMMIT ===\n";
      output += execSync("git log -n 1 --oneline").toString() + "\n";
      output += "=== GIT STATUS ===\n";
      output += execSync("git status").toString() + "\n";
    } catch (e: any) {
      output += `Git command failed: ${e.message}\n`;
    }

    // 2. Check PM2 status
    try {
      output += "=== PM2 STATUS ===\n";
      output += execSync("pm2 status").toString() + "\n";
    } catch (e: any) {
      output += `PM2 status command failed: ${e.message}\n`;
    }

    // 3. Read pm2-logs.txt
    try {
      output += "=== PM2 LOGS FILE ===\n";
      const logPath = "public/pm2-logs.txt";
      if (fs.existsSync(logPath)) {
        output += fs.readFileSync(logPath, "utf-8") + "\n";
      } else {
        output += "public/pm2-logs.txt does not exist.\n";
      }
    } catch (e: any) {
      output += `Reading logs file failed: ${e.message}\n`;
    }

    // 4. Read direct PM2 logs command
    try {
      output += "=== PM2 LOGS DIRECT ===\n";
      output += execSync("pm2 logs mie-crm --lines 50 --no-colors").toString() + "\n";
    } catch (e: any) {
      output += `PM2 logs direct command failed: ${e.message}\n`;
    }

    return new NextResponse(output, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Simple in-memory Rate Limiter map: IP -> timestamp[]
const rateLimitMap = new Map<string, number[]>();
const LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // Max 10 requests per minute

/**
 * PUBLIC ENDPOINT for leads coming from the web form.
 * No verifyAuthRole required.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get client IP with reverse proxy consideration (x-forwarded-for)
    const xForwardedFor = request.headers.get("x-forwarded-for");
    const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : "127.0.0.1";

    // 2. Apply Rate Limiting
    const now = Date.now();
    let timestamps = rateLimitMap.get(ip) || [];
    // Keep only timestamps within the current window
    timestamps = timestamps.filter(t => now - t < LIMIT_WINDOW);
    
    if (timestamps.length >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Intenta de nuevo más tarde." },
        { status: 429 }
      );
    }
    
    // Add current timestamp and update map
    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);

    const body = await request.json();
    const { 
      titulo, nombreContacto, empresa, email, notas, origenLead, 
      telefono, sector, numEmpleados, procesoAAutomatizar, planInteres 
    } = body;

    // Basic validation
    if (!nombreContacto || !email) {
      return NextResponse.json({ error: "Nombre y Email son obligatorios" }, { status: 400 });
    }

    // Strict Email Format Validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const newLead = await prisma.lead.create({
      data: {
        titulo: sanitize(titulo) || `Nuevo Lead Web: ${sanitize(nombreContacto)}`,
        nombreContacto: sanitize(nombreContacto),
        empresa: sanitize(empresa) || "Sin Empresa",
        email: sanitize(email),
        notas: sanitize(notas) || "",
        origenLead: sanitize(origenLead) || "Formulario Web",
        etapa: "NUEVO",
        telefono: sanitize(telefono) || "",
        valorEstimated: 0, // default placeholder
        
        // Custom Make It Easy fields
        sector: sanitize(sector) || "",
        numEmpleados: sanitize(numEmpleados) || "",
        procesoAAutomatizar: sanitize(procesoAAutomatizar) || "",
        planInteres: sanitize(planInteres) || "",
      }
    } as any); // cast since schema types might not compile yet locally in IDE

    return NextResponse.json({ success: true, id: newLead.id }, { status: 201 });
  } catch (error) {
    console.error("Public Lead Error:", error);
    return NextResponse.json({ error: 'Error al procesar el lead' }, { status: 500 });
  }
}
