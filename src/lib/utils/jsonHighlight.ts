function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function jsonHighlight(value: unknown): string {
  const json = escapeHtml(JSON.stringify(value, null, 2));

  return json.replace(
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(?=\s*:)|"(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?/g,
    (match) => {
      if (match.startsWith('"') && match.endsWith(":")) {
        return `<span class="json-key">${match}</span>`;
      }

      if (match.startsWith('"')) {
        return `<span class="json-string">${match}</span>`;
      }

      if (match === "true" || match === "false") {
        return `<span class="json-boolean">${match}</span>`;
      }

      if (match === "null") {
        return `<span class="json-null">${match}</span>`;
      }

      return `<span class="json-number">${match}</span>`;
    },
  );
}
