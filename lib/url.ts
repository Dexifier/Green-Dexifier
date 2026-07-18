// URL joining for provider API bases.
//
// Why not `new URL(path, base)`? Because a leading-slash `path` is treated
// as absolute and silently drops any path prefix in the base:
//   new URL("/rate", "https://exolix.com/api/v2").href === "https://exolix.com/rate"
// This helper concatenates instead, preserving the base's path prefix.

export function joinApiUrl(
  base: string,
  path: string,
  params?: Record<string, string>,
): URL {
  const url = new URL(
    base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, ""),
  );
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }
  return url;
}
