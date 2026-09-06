// Supabase/PostgREST zwraca relację "do jednego" czasem jako obiekt, a czasem jako
// jednoelementową tablicę (zależnie od wersji klienta/zapytania) — ten helper ujednolica odczyt.
export function unwrapRelation<T>(field: T | T[] | null | undefined): T | undefined {
  if (!field) return undefined;
  return Array.isArray(field) ? field[0] : field;
}
