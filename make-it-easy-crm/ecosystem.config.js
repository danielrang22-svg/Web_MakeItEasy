module.exports = {
  apps: [
    {
      name: "mie-crm",
      script: "node_modules/.bin/next",
      args: "start -p 3002",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
    {
      // Cron job: sincroniza productos Siigo ↔ CRM cada hora
      name: "mie-siigo-sync",
      script: "scripts/siigo-sync.js",
      cwd: "./",
      cron_restart: "*/5 * * * *", // Cada 5 minutos
      autorestart: false,        // No reiniciar tras completar, esperar al siguiente cron
      watch: false,
      env_production: {
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3002",
      },
    },
  ],
};
