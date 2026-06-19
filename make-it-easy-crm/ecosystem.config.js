module.exports = {
  apps: [
    {
      name: "mie-crm",
      // next start funciona correctamente ahora que se quitó output:standalone
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/html/makeiteasy/make-it-easy-crm",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env_production: {
        NODE_ENV: "production",
        PORT: 3005,
        HOSTNAME: "0.0.0.0",
        NEXT_PUBLIC_APP_URL: "https://crm.makeiteasycol.com",
      },
    },
    {
      // Cron job: sincroniza productos Siigo ↔ CRM cada hora
      name: "mie-siigo-sync",
      script: "scripts/siigo-sync.js",
      cwd: "/var/www/html/makeiteasy/make-it-easy-crm",
      cron_restart: "*/5 * * * *", // Cada 5 minutos
      autorestart: false,          // No reiniciar tras completar, esperar al siguiente cron
      watch: false,
      env_production: {
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3005",
      },
    },
  ],
};
