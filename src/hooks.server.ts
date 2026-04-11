import { CLERK_SECRET_KEY } from "$env/static/private";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { handleClerk } from "clerk-sveltekit/server";
import { env } from "$lib/env";

const PUBLIC_ROUTES = new Set([
  "/",
  "/sign-in",
  "/sign-up",
  "/demo",
  "/docs",
  "/pricing",
  "/changelog",
  "/privacy",
  "/refund",
  "/terms-and-conditions",
  "/api/webhooks/polar",
  "/api/webhooks/stripe",
  "/api/webhooks/paddle",
  "/api/webhooks/lemonsqueezy",
  "/api/polar/callback",
  "/api/stripe/callback",
  "/api/analytics",
  "/api/health",
]);

const isDashboardRoute = (pathname: string) =>
  pathname === "/dashboard" || pathname.startsWith("/dashboard/");

const isPublicRoute = (pathname: string) => PUBLIC_ROUTES.has(pathname);

const csrfProtection: Handle = async ({ event, resolve }) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(event.request.method)) {
    const origin = event.request.headers.get("origin");
    const host = event.url.origin;

    if (origin && origin !== host) {
      return new Response("CSRF check failed", { status: 403 });
    }
  }

  return resolve(event);
};

const securityHeaders: Handle = async ({ event, resolve }) => {
  const resolved = await resolve(event);
  const response = new Response(resolved.body, resolved);
  const csp = [
    "default-src 'self'",
    [
      "script-src 'self' 'unsafe-inline' blob:",
      "https://clerk.churnpulse.io",
      "https://*.clerk.accounts.dev",
    ].join(" "),
    "worker-src 'self' blob:",
    ["style-src 'self' 'unsafe-inline'", "https://fonts.googleapis.com"].join(
      " ",
    ),
    ["font-src 'self'", "https://fonts.gstatic.com"].join(" "),
    "img-src 'self' data: https:",
    [
      "connect-src 'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://api.clerk.com",
      "https://clerk.churnpulse.io",
      "https://*.clerk.accounts.dev",
    ].join(" "),
    [
      "frame-src 'self'",
      "https://clerk.churnpulse.io",
      "https://*.clerk.accounts.dev",
    ].join(" "),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set("Content-Security-Policy", csp);

  if (env.nodeEnv === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return response;
};

const protectDashboardRoutes: Handle = async ({ event, resolve }) => {
  if (
    isPublicRoute(event.url.pathname) ||
    !isDashboardRoute(event.url.pathname)
  ) {
    return resolve(event);
  }

  if (event.locals.session) {
    return resolve(event);
  }

  const signInUrl = new URL("/sign-in", event.url.origin);
  signInUrl.searchParams.set(
    "redirectUrl",
    `${event.url.pathname}${event.url.search}`,
  );

  return Response.redirect(signInUrl, 307);
};

export const handle: Handle = sequence(
  securityHeaders,
  csrfProtection,
  handleClerk(CLERK_SECRET_KEY, {
    signInUrl: "/sign-in",
  }),
  protectDashboardRoutes,
);
