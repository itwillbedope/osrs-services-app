const appDirectory =
  process.env.OSRS_APP_DIR || "/var/www/osrs-services/current";
const logDirectory = process.env.OSRS_LOG_DIR || "/var/log/osrs-services";

module.exports = {
  apps: [
    {
      name: "osrs-web",
      cwd: appDirectory,
      script: "pnpm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 5000,
      out_file: `${logDirectory}/osrs-web-out.log`,
      error_file: `${logDirectory}/osrs-web-error.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      time: true,
      merge_logs: false,
    },
    {
      name: "osrs-chat",
      cwd: appDirectory,
      script: "pnpm",
      args: "chat:start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 5000,
      out_file: `${logDirectory}/osrs-chat-out.log`,
      error_file: `${logDirectory}/osrs-chat-error.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      time: true,
      merge_logs: false,
    },
  ],
};
