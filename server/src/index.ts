import "dotenv/config";
import { buildApp } from "./app";
import { createSocketServer } from "./plugins/socket";
import { env } from "./config/env";

async function main() {
  const app = await buildApp();

  // Create Socket.io server attached to Fastify's underlying HTTP server
  await app.ready();
  createSocketServer(app.server, app);

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`\nFamily Chat Server running on port ${env.PORT}`);
    console.log(`  Local:   http://localhost:${env.PORT}`);
    console.log(`  Health:  http://localhost:${env.PORT}/health\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
