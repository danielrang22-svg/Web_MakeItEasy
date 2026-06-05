/**
 * Shared input validation utilities for API routes.
 */

const MAX_TEXT_LENGTH = 5000;
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Remove control characters from a string (keeps \t \n \r) */
export function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHAR_REGEX, "").slice(0, MAX_TEXT_LENGTH);
}

/** Validate required string fields. Returns error message or null. */
export function requireFields(
  body: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    const val = body[field];
    if (val === undefined || val === null || val === "") {
      return `El campo '${field}' es requerido`;
    }
  }
  return null;
}

/** Validate that a field is a number. Returns error message or null. */
export function requireNumber(
  body: Record<string, unknown>,
  field: string
): string | null {
  const val = body[field];
  if (val !== undefined && isNaN(Number(val))) {
    return `El campo '${field}' debe ser un número`;
  }
  return null;
}
