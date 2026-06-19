module.exports = {
  apps: [
    {
      name: "mie-crm",
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
  ],
};
