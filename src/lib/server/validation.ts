import { z } from "zod";
import { json } from "@sveltejs/kit";
import type { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { success: false, error: messages };
  }
  return { success: true, data: result.data };
}

export function apiError(message: string, status: number = 500) {
  return json({ success: false, message }, { status });
}

export function apiSuccess<T extends Record<string, unknown>>(data: T, status: number = 200) {
  return json({ success: true, ...data }, { status });
}