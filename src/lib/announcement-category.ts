import type { CardAccent } from '@/components/ui/Card';
import type { PillVariant } from '@/components/ui/Pill';

export type CategoryMeta = { accent: CardAccent; pillVariant: PillVariant; label: string };

// Mapowanie nazwy kategorii z announcements_category (tekst wpisany w bazie, po polsku,
// małymi literami) na kolor/wygląd karty ogłoszenia. Używane zarówno na liście ogłoszeń,
// jak i na ekranie jego szczegółów — stąd wspólne miejsce zamiast dwóch kopii.
const CATEGORY_META: Record<string, CategoryMeta> = {
  'ważne': { accent: 'amber', pillVariant: 'amber', label: 'Ważne' },
  'ogólne': { accent: 'blue', pillVariant: 'blue', label: 'Ogólne' },
  'spotkanie odwołane': { accent: 'red', pillVariant: 'red', label: 'Spotkanie odwołane' },
  'zaproszenie na spotkanie': { accent: 'green', pillVariant: 'green', label: 'Zaproszenie na spotkanie' },
};
const DEFAULT_META: CategoryMeta = { accent: 'blue', pillVariant: 'neutral', label: 'Ogólne' };

export function getCategoryMeta(categoryName?: string | null): CategoryMeta {
  if (!categoryName) return DEFAULT_META;
  return CATEGORY_META[categoryName.toLowerCase()] ?? { accent: 'blue', pillVariant: 'neutral', label: categoryName };
}
