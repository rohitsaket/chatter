import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import type { ServerOptions } from "socket.io";
import { loadEnv } from "@chatter/config";

/** Socket.IO adapter backed by Redis pub/sub for horizontal scaling. */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  async connectToRedis(url: string): Promise<void> {
    const pub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    this.adapterConstructor = createAdapter(pub, sub);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    const env = loadEnv();
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: env.WEB_ORIGIN, credentials: true },
    });
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
