import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import crypto from "crypto";

const execAsync = promisify(exec);

// Secret para verificar que la solicitud viene de GitHub Actions
const DEPLOY_SECRET = process.env.DEPLOY_WEBHOOK_SECRET || "";

function verifySignature(body: string, signature: string): boolean {
  if (!DEPLOY_SECRET) return false;
  const expected = `sha256=${crypto
    .createHmac("sha256", DEPLOY_SECRET)
    .update(body)
    .digest("hex")}`;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-deploy-signature") || "";

    // Verificar firma de seguridad
    if (!verifySignature(body, signature)) {
      console.error("[Deploy] Firma inválida — solicitud rechazada");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Deploy] ✅ Solicitud de deploy autorizada — iniciando...");

    const appDir = process.env.APP_DIR || "/var/www/html/makeiteasy/make-it-easy-crm";
    const nvmInit = `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`;

    // Ejecutar deploy en background para no bloquear la respuesta HTTP
    const deployScript = `
      ${nvmInit}
      cd ${appDir}
      git pull origin main 2>&1
      npm install --production=false 2>&1
      npx prisma generate 2>&1
      npm run build 2>&1
      pm2 restart mie-crm 2>&1
      echo "=== DEPLOY COMPLETADO ==="
    `.trim();

    // Responder inmediatamente y ejecutar en background
    execAsync(`bash -c '${deployScript.replace(/'/g, "'\\''")}'`)
      .then(({ stdout, stderr }) => {
        console.log("[Deploy] ✅ Deploy completado:");
        console.log(stdout);
        if (stderr) console.error("[Deploy] stderr:", stderr);
      })
      .catch((err) => {
        console.error("[Deploy] ❌ Error en deploy:", err.message);
      });

    return NextResponse.json({
      success: true,
      message: "Deploy iniciado en background",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Deploy] Error:", error);
    return NextResponse.json({ error: "Deploy failed" }, { status: 500 });
  }
}

// GET para verificar que el endpoint está activo
export async function GET() {
  return NextResponse.json({
    status: "Deploy webhook activo",
    timestamp: new Date().toISOString(),
  });
}
