const { SignJWT } = require("jose");
const http = require("http");

const secretStr = "f3b70c97315d40a5a9c2fdb70c97315d582f0dd5cac640a5";
const AUTH_SECRET = new TextEncoder().encode(secretStr);

async function run() {
  try {
    console.log("Generating valid JWT token...");
    const token = await new SignJWT({ email: "admin@vibrand.com", role: "ADMIN", nombre: "Admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(AUTH_SECRET);

    console.log("Token generated successfully.");

    // Enviar petición HTTP al VPS en el puerto 3002
    const options = {
      hostname: "187.77.196.199",
      port: 3002,
      path: "/api/cotizaciones/debug-logs",
      method: "GET",
      headers: {
        "Cookie": `mie-auth=${token}`
      }
    };

    console.log("Fetching logs from http://187.77.196.199:3002/api/cotizaciones/debug-logs...");
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log("--- VPS LOGS START ---");
        console.log(data);
        console.log("--- VPS LOGS END ---");
      });
    });

    req.on("error", (e) => {
      console.error(`Problem with request: ${e.message}`);
    });

    req.end();
  } catch (err) {
    console.error("Error generating token/fetching:", err);
  }
}

run();
