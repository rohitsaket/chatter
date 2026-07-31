import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { loadEnv } from "@chatter/config";
import { createLogger } from "@chatter/logger";
import { requestObservability } from "@chatter/observability";
import { AppModule } from "./app.module";
import { RedisIoAdapter } from "./realtime/redis-io.adapter";

const logger = createLogger("api");

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { logger: false });

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cookieParser(env.SESSION_SECRET));
  app.use(requestObservability());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.setGlobalPrefix("api/v1", { exclude: ["health", "metrics"] });

  const ioAdapter = new RedisIoAdapter(app);
  await ioAdapter.connectToRedis(env.REDIS_URL);
  app.useWebSocketAdapter(ioAdapter);

  const doc = new DocumentBuilder()
    .setTitle("Chatter API")
    .setVersion("1.0")
    .addCookieAuth("chatter_session")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, doc));

  await app.listen(env.API_PORT);
  logger.info({ port: env.API_PORT }, "API listening");
}

bootstrap().catch((err) => {
  logger.error(err, "API failed to start");
  process.exit(1);
});
