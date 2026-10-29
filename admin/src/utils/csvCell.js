export function escapeCSVCell(value) {
  let text = value == null ? '' : String(value);
  // Quoting alone does not stop spreadsheet applications from evaluating formulas.
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}
