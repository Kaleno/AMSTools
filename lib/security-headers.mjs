/** Response headers for every route. A full script CSP is intentionally not included. */
export function securityHeaders(nodeEnv = process.env.NODE_ENV) {
  const headers = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()",
    },
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  ];
  if (nodeEnv === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=15552000",
    });
  }
  return headers;
}
