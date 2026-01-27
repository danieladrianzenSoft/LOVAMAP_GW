export function formatDate(dateString?: string | null): string {
  if (!dateString) return "";

  const date = new Date(dateString);

  // Use Intl.DateTimeFormat for locale-safe formatting
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
