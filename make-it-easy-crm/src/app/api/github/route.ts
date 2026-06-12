import { NextRequest, NextResponse } from "next/server";
import { verifyAuthRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await verifyAuthRole(request);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo"); // e.g. "owner/repo"
  const type = searchParams.get("type"); // "branches" | "prs" | "commits"

  if (!repo || !type) {
    return NextResponse.json({ error: "Faltan parámetros repo o type" }, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Falta GITHUB_TOKEN en el servidor" }, { status: 500 });
  }

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github.v3+json",
  };

  try {
    let url = "";
    if (type === "branches") {
      url = `https://api.github.com/repos/${repo}/branches`;
    } else if (type === "prs") {
      url = `https://api.github.com/repos/${repo}/pulls?state=all&per_page=20`;
    } else if (type === "commits") {
      url = `https://api.github.com/repos/${repo}/commits?per_page=15`;
    } else {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
    } catch (error: any) {
    console.error("GET /api/github error:", error.message);
    return NextResponse.json({ error: error.message || "Error al consultar GitHub API" }, { status: 500 });
  }
}
