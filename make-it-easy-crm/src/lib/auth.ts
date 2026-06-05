import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export interface TokenPayload {
  email: string;
  role: string;
  nombre: string;
}

/**
 * Autentica un request midiendo el token contra el Secret del sistema
 * y valida si es acorde a una matriz de roles dados (si existiera).
 */
export async function verifyAuthRole(request: NextRequest, allowedRoles?: string[]): Promise<TokenPayload | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const token = request.cookies.get("mie-auth")?.value;
    if (!token) return null;

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);

    const userPayload = payload as unknown as TokenPayload;

    if (allowedRoles && !allowedRoles.includes(userPayload.role)) {
       return null;
    }

    return userPayload;
  } catch (err) {
    return null;
  }
}
