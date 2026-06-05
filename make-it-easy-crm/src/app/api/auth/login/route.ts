import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable is required");
}

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET);
const COOKIE_NAME = "mie-auth";

// Simple in-memory rate limiting
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getIP(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0] ?? 
         request.headers.get("x-real-ip") ?? 
         "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getIP(request);
  const now = Date.now();

  try {
    const { email, password } = await request.json();

    // Check rate limit
    const attempt = loginAttempts.get(ip);
    if (attempt && attempt.count >= MAX_ATTEMPTS && (now - attempt.lastAttempt) < WINDOW_MS) {
      const minutesLeft = Math.ceil((WINDOW_MS - (now - attempt.lastAttempt)) / 60000);
      console.log(`[AUTH] ${new Date().toISOString()} | RATE_LIMIT | ip: ${ip} | email: ${email}`);
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${minutesLeft} minutos.` },
        { status: 429 }
      );
    }

    // Buscar el usuario por email
    const user = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!user || (!user.activo)) {
      // Record failed attempt
      const current = loginAttempts.get(ip) || { count: 0, lastAttempt: now };
      loginAttempts.set(ip, { count: current.count + 1, lastAttempt: now });

      console.log(`[AUTH] ${new Date().toISOString()} | LOGIN_FAIL | email: ${email} | reason: not_found_or_inactive | ip: ${ip}`);
      return NextResponse.json({ error: "Credenciales inválidas o cuenta desactivada" }, { status: 401 });
    }

    // Comparar los hashes
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (passwordMatch) {
      // Clear rate limit on success
      loginAttempts.delete(ip);
      // Create JWT token con rol real
      const token = await new SignJWT({ email: user.email, role: user.rol, nombre: user.nombre })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(AUTH_SECRET);

      const response = NextResponse.json({ success: true, role: user.rol });

      // Set HttpOnly cookie for security
      response.cookies.set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24, // 24 hours
        sameSite: "strict",
      });

      // Set non-httpOnly cookie for role-based UI logic
      response.cookies.set({
        name: "mie-role",
        value: user.rol,
        httpOnly: false,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24,
        sameSite: "strict",
      });

      console.log(`[AUTH] ${new Date().toISOString()} | LOGIN_OK | user: ${user.email} | ip: ${ip}`);
      return response;
    } else {
      // Record failed attempt
      const current = loginAttempts.get(ip) || { count: 0, lastAttempt: now };
      loginAttempts.set(ip, { count: current.count + 1, lastAttempt: now });

      console.log(`[AUTH] ${new Date().toISOString()} | LOGIN_FAIL | email: ${email} | ip: ${ip}`);
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
