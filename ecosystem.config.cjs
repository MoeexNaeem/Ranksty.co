/**
 * PM2 config for rankkw.online.
 *
 * Its own app name and port, so it never touches other sites on the same server.
 * It listens on 127.0.0.1 only: the public reaches it through nginx.
 *
 *   pm2 start ecosystem.config.cjs     # first time
 *   pm2 save                           # keep it across reboots
 *   pm2 logs rankkw-online             # live logs
 *
 * Deploys after that: bash scripts/deploy.sh
 */
const PORT = Number(process.env.PORT) || 3300
const INSTANCES = Number(process.env.PM2_INSTANCES) || 2

module.exports = {
  apps: [
    {
      name: 'rankkw-online',
      script: 'node_modules/next/dist/bin/next',
      args: `start -p ${PORT} -H 127.0.0.1`,
      exec_mode: 'cluster',
      instances: INSTANCES,
      autorestart: true,
      // Collect garbage before PM2's limit, recycle a worker before it can grow too large.
      node_args: `--max-old-space-size=${Number(process.env.NODE_HEAP_MB) || 1024}`,
      max_memory_restart: process.env.PM2_MAX_MEMORY || '1400M',
      exp_backoff_restart_delay: 200,
      kill_timeout: 8000,
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: 'production',
        PORT: String(PORT),
        PM2_INSTANCES: String(INSTANCES),
      },
    },
  ],
}
