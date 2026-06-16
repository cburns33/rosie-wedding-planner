import type { ErrorEvent } from "@sentry/nextjs";

const SENSITIVE_KEY =
  /message|content|prompt|body|chat|vendor|wedding|anthropic|zola|token|snapshot|guest|rsvp|registry|image|base64|palette/i;

/** Strip wedding/chat/integration payload data before events leave the app. */
export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  const url = event.request?.url ?? "";

  if (
    url.includes("/api/chat") ||
    url.includes("/api/chat/upload") ||
    url.includes("/api/wedding-state") ||
    url.includes("/api/integrations/") ||
    url.includes("/api/cron/")
  ) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      if (event.request.headers) {
        const headers = { ...event.request.headers };
        delete headers.cookie;
        delete headers.authorization;
        event.request.headers = headers;
      }
    }
  }

  if (event.extra) {
    for (const key of Object.keys(event.extra)) {
      if (SENSITIVE_KEY.test(key)) {
        delete event.extra[key];
      }
    }
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => {
      if (crumb.category === "fetch" && typeof crumb.data?.url === "string") {
        const fetchUrl = crumb.data.url as string;
        if (
          fetchUrl.includes("/api/chat") ||
          fetchUrl.includes("/api/integrations/") ||
          fetchUrl.includes("/api/cron/") ||
          fetchUrl.includes("mobile-api.zola.com")
        ) {
          return { ...crumb, data: { url: fetchUrl } };
        }
      }
      return crumb;
    });
  }

  return event;
}
