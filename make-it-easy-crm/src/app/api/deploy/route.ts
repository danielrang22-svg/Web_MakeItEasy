import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import crypto from "crypto";

const execAsync = promisify(exec);

const DEPLOY_SECRET = process.env.DEPLOY_WEBHOOK_SECRET || "";
const APP_DIR =
  process.env.APP_DIR ||
  "/var/www/html/makeiteasy/make-it-easy-crm";

function verifySignature(body: string, signature: string): boolean {
  if (!DEPLOY_SECRET) {
    console.error("[Deploy] DEPLOY_WEBHOOK_SECRET no está configurado en .env");
    return false;
  }
  try {
    const expected = `sha256=${crypto
      .createHmac("sha256", DEPLOY_SECRET)
      .update(body)
      .digest("hex")}`;
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-deploy-signature") || "";

    if (!verifySignature(body, signature)) {
      console.error("[Deploy] Firma inválida — solicitud rechazada");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Deploy] ✅ Solicitud autorizada — iniciando deploy...");

    // Script de deploy — sin git pull (el código ya está en disco por rsync)
    // deploy.sh resuelve node, instala, migra, compila y recarga pm2.
    const deployScript = [
      `cd "${APP_DIR}"`,
      `bash "${APP_DIR}/scripts/deploy.sh" >> /var/log/mie-crm-deploy.log 2>&1`,
    ].join(" && ");

    // Responder inmediatamente y ejecutar en background
    execAsync(`bash -c ${JSON.stringify(deployScript)}`)
      .then(({ stdout, stderr }) => {
        console.log("[Deploy] ✅ Resultado:");
        console.log(stdout?.slice(-2000));
        if (stderr) console.error("[Deploy] stderr:", stderr?.slice(-500));
      })
      .catch((err) => {
        console.error("[Deploy] ❌ Error:", err.message?.slice(-500));
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

// GET — health check del endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "deploy webhook activo",
    timestamp: new Date().toISOString(),
    hasSecret: !!process.env.DEPLOY_WEBHOOK_SECRET,
    appDir: APP_DIR,
  });
}
