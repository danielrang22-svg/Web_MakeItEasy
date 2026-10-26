const fs = require("fs");
const env = {};
const envPath = "/var/www/apps/mie-crm/.env";
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
}

module.exports = {
  apps: [
    {
      name: "mie-crm",
      script: ".next/standalone/server.js",
      cwd: "/var/www/apps/mie-crm",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "600M",
      env: { NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: "3011", ...env },
      error_file: "/var/log/mie-crm-error.log",
      out_file: "/var/log/mie-crm-out.log",
      time: true,
    },
  ],
};
