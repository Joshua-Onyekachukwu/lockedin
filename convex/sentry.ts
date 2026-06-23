type CaptureArgs = {
  message: string;
  level?: "fatal" | "error" | "warning" | "info";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length > 500) return `${value.slice(0, 500)}…`;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 25).map((v) => scrubValue(v, depth + 1));
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const keys = Object.keys(obj).slice(0, 50);
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (
        lower.includes("authorization") ||
        lower.includes("cookie") ||
        lower.includes("secret") ||
        lower.includes("token") ||
        (lower.endsWith("key") && lower !== "monkey")
      ) {
        out[key] = "[redacted]";
      } else {
        out[key] = scrubValue(obj[key], depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

function dsnToStoreUrl(dsn: string) {
  const url = new URL(dsn);
  const publicKey = url.username;
  const projectId = url.pathname.replace("/", "");
  const origin = `${url.protocol}//${url.host}`;
  const storeUrl = `${origin}/api/${projectId}/store/`;
  return { storeUrl, publicKey };
}

export async function captureToSentry(args: CaptureArgs) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  let store: { storeUrl: string; publicKey: string } | null = null;
  try {
    store = dsnToStoreUrl(dsn);
  } catch {
    return;
  }

  const url = `${store.storeUrl}?sentry_version=7&sentry_client=lockedin&sentry_key=${encodeURIComponent(store.publicKey)}`;
  const extra = scrubValue(args.extra ?? {}) as Record<string, unknown>;
  const environment =
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
  const release =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_REF ??
    process.env.GIT_COMMIT_SHA ??
    undefined;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: args.message,
        level: args.level ?? "error",
        tags: args.tags ?? {},
        extra,
        platform: "javascript",
        timestamp: Date.now() / 1000,
        environment,
        release,
      }),
    });
  } catch {}
}
