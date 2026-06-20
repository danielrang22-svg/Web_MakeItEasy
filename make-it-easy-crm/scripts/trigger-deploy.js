const crypto = require("crypto");
const http = require("http");

const DEPLOY_SECRET = "mie-deploy-secret-2026";
const body = JSON.stringify({ trigger: "manual" });

// Calculate expected signature
const signature = "sha256=" + crypto
  .createHmac("sha256", DEPLOY_SECRET)
  .update(body)
  .digest("hex");

function sendDeployRequest(port) {
  return new Promise((resolve) => {
    console.log(`Enviando petición de deploy a http://187.77.196.199:${port}/api/deploy...`);
    
    const options = {
      hostname: "187.77.196.199",
      port: port,
      path: "/api/deploy",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-deploy-signature": signature,
        "Content-Length": Buffer.byteLength(body)
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        console.log(`[Puerto ${port}] Código de Estado: ${res.statusCode}`);
        console.log(`[Puerto ${port}] Respuesta:`, data);
        resolve(res.statusCode === 200);
      });
    });

    req.on("error", (e) => {
      console.log(`[Puerto ${port}] Error de conexión: ${e.message}`);
      resolve(false);
    });

    req.write(body);
    req.end();
  });
}

async function run() {
  // Probar ambos puertos comunes en su VPS (3002 y 3006)
  const ok3002 = await sendDeployRequest(3002);
  if (!ok3002) {
    await sendDeployRequest(3006);
  }
}

run();
