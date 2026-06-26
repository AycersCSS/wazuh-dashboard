import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

export function startMocks(): void {
  server.listen({ onUnhandledRequest: "error" });
}

export function stopMocks(): void {
  server.close();
}

export function resetMocks(): void {
  server.resetHandlers();
}
