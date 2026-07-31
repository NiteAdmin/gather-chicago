/**
 * Formats a raw string into a US phone number format: (XXX) XXX-XXXX.
 * Strips all non-numeric input and restricts the length to a maximum of 10 digits.
 */
export function formatPhoneNumber(input: string): string {
  if (!input) return "";
  
  // Strip all non-digit characters and cap at 10 digits
  const digits = input.replace(/\D/g, "").slice(0, 10);
  
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
