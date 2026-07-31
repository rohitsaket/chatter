import { randomUUID } from "node:crypto";

/** In-process metrics registry exposed at /metrics (Prometheus text format). */
class Metrics {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  inc(name: string, labels: Record<string, string> = {}, by = 1): void {
    const key = this.key(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + by);
  }

  observe(name: string, labels: Record<string, string>, value: number): void {
    const key = this.key(name, labels);
    const arr = this.histograms.get(key) ?? [];
    arr.push(value);
    if (arr.length > 5000) arr.shift();
    this.histograms.set(key, arr);
  }

  private key(name: string, labels: Record<string, string>): string {
    const l = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v.replace(/"/g, '\\"')}"`)
      .join(",");
    return l ? `${name}{${l}}` : name;
  }

  render(): string {
    const lines: string[] = [];
    for (const [key, value] of this.counters) lines.push(`${key} ${value}`);
    for (const [key, values] of this.histograms) {
      const sum = values.reduce((a, b) => a + b, 0);
      lines.push(`${key.replace(/(\{|$)/, "_sum$1")} ${sum}`);
      lines.push(`${key.replace(/(\{|$)/, "_count$1")} ${values.length}`);
    }
    return lines.join("\n") + "\n";
  }
}

export const metrics = new Metrics();

export function newRequestId(): string {
  return randomUUID();
}

/** Express-style middleware: request-id propagation + request metrics. */
export function requestObservability() {
  return (req: any, res: any, next: () => void) => {
    const id = (req.headers["x-request-id"] as string | undefined) ?? newRequestId();
    req.requestId = id;
    res.setHeader("x-request-id", id);
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const route = (req.route?.path as string | undefined) ?? req.path ?? "unknown";
      metrics.inc("http_requests_total", { method: req.method, route, status: String(res.statusCode) });
      metrics.observe("http_request_duration_ms", { method: req.method, route }, ms);
    });
    next();
  };
}
