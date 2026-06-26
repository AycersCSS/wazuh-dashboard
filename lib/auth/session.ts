// Server-only session helpers. The cookie holds the connector JWT;
// the browser never sees it.

import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = process.env.CONNECTOR_JWT_COOKIE ?? "connector_jwt";
const isProd = process.env.NODE_ENV === "production";

export function getJwt(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}

export function setJwt(token: string): void {
  cookies().set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: isProd,
    path: "/"
  });
}

export function clearJwt(): void {
  cookies().set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: isProd,
    path: "/",
    maxAge: 0
  });
}
