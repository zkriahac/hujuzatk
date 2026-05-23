// Convert Arabic-Indic (٠-٩, U+0660–U+0669) and Persian/Urdu (۰-۹, U+06F0–U+06F9)
// digits to ASCII 0-9. Used on every numeric input so an Arabic keyboard on iOS /
// Android doesn't produce an unparseable value.
//
// We deliberately do this in JS (not via input type=number) because Safari rejects
// Arabic-Indic digits silently from type=number, leaving the input blank.
export function normalizeDigits(input: string): string {
  if (!input) return input;
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code >= 0x0660 && code <= 0x0669) {
      out += String.fromCharCode(code - 0x0660 + 0x30); // Arabic-Indic
    } else if (code >= 0x06F0 && code <= 0x06F9) {
      out += String.fromCharCode(code - 0x06F0 + 0x30); // Extended (Persian / Urdu)
    } else {
      out += input[i];
    }
  }
  return out;
}

// Stricter sanitizer for money / numeric inputs:
//  - Normalizes Arabic-Indic + Persian digits to ASCII
//  - Strips anything that isn't a digit or a single decimal separator
//  - Accepts Arabic decimal mark (٫, U+066B) as '.'
//  - Collapses multiple dots to one (keeps the first)
export function sanitizeNumeric(input: string): string {
  if (!input) return input;
  let s = normalizeDigits(input).replace(/٫/g, '.');
  // Allow a leading minus? Prices aren't negative — drop it.
  s = s.replace(/[^0-9.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  return s;
}
