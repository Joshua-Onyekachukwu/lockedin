type CaptureArgs = {
  message: string;
  level?: "fatal" | "error" | "warning" | "info";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

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

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: args.message,
        level: args.level ?? "error",
        tags: args.tags ?? {},
        extra: args.extra ?? {},
        platform: "javascript",
        timestamp: Date.now() / 1000,
      }),
    });
  } catch {}
}

