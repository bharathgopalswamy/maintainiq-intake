import "dotenv/config";
import { createApp } from "./app.js";
import { createLogger } from "./logger.js";

const port = Number(process.env.PORT) || 3001;
const logger = createLogger();

createApp({ logger }).listen(port, "0.0.0.0", () => {
  logger.info({ event: "server.started", port });
});
