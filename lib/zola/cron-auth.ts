/**
 * Guards the cron + manual-sync + CSV-import routes. These are Chase-only and
 * are exempted from magic-link auth in middleware, so they self-protect with
 * `CRON_SECRET` (sent as a Bearer token, the convention Vercel Cron uses).
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
