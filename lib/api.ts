// One error shape for every route: { error: { code, message } } (docs/ARCHITECTURE.md §5).
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getCurrentUser } from "./session";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export const unauthenticated = () => new ApiError(401, "UNAUTHENTICATED", "Sign in to continue.");
export const notFound = (what = "Document") => new ApiError(404, "NOT_FOUND", `${what} not found, or you don't have access to it.`);
export const forbidden = (message: string) => new ApiError(403, "FORBIDDEN", message);
export const invalid = (message: string) => new ApiError(400, "VALIDATION", message);

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

export function route<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return errorResponse(e.status, e.code, e.message);
      if (e instanceof ZodError) return errorResponse(400, "VALIDATION", e.issues[0]?.message ?? "Invalid input.");
      console.error(e);
      return errorResponse(500, "INTERNAL", "Something went wrong on our side. Try again.");
    }
  };
}

export function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw invalid("Request body must be JSON.");
  }
  return schema.parse(body);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw forbidden("Only admins can manage accounts.");
  return user;
}
