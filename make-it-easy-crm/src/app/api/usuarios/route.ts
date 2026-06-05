import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyAuthRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request, ["admin"]);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        fechaCreacion: true,
      },
      orderBy: { fechaCreacion: "desc" },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthRole(request, ["admin"]);
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { email, nombre, password, rol } = body;

    if (!email || !nombre || !password) {
       return NextResponse.json({ error: "Email, nombre y contraseña requeridos" }, { status: 400 });
    }

    if (password.length < 8) {
       return NextResponse.json({ error: "La contraseña debe tener mínimo 8 caracteres" }, { status: 400 });
    }

    const exist = await prisma.usuario.findUnique({ where: { email } });
    if (exist) {
       return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userRole = rol === "admin" ? "admin" : "ventas";

    const newUser = await prisma.usuario.create({
      data: {
        email,
        nombre,
        passwordHash: hashed,
        rol: userRole,
        activo: true
      },
      select: { id: true, email: true, nombre: true, rol: true, activo: true }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}
