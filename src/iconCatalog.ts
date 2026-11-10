export interface IconCatalogItem {
  id: string;
  keywords: string;
}

export interface IconMetadataEntry {
  id: string;
  k?: string;
  t?: 'o' | 'f' | string;
}

export interface IconLibrary {
  d?: Record<string, string>;
  l?: Record<string, IconMetadataEntry>;
}

export interface IconSearchResults {
  icons: IconCatalogItem[];
  total: number;
  query: string;
}

export const ICON_SEARCH_PAGE_SIZE = 72;

export const CURATED_ICON_LIST: IconCatalogItem[] = [
  { id: 'copy-plus', keywords: 'copy duplicate plus add layer' },
  { id: 'layers-plus', keywords: 'layers stack plus add' },
  { id: 'plus-square', keywords: 'plus add new square' },
  { id: 'stop-square', keywords: 'stop square media' },
  { id: 'rows-two', keywords: 'rows pause bars list' },
  { id: 'type-square', keywords: 'text type font t' },
  { id: 'diamonds', keywords: 'diamonds grid component' },
  { id: 'circle-fill', keywords: 'circle record dot' },
  { id: 'square-fill', keywords: 'square box' },
  { id: 'globe', keywords: 'globe web browser internet url' },
  { id: 'sparkles', keywords: 'sparkles magic smart ai star' },
  { id: 'play-square', keywords: 'play video media square' },
  { id: 'image', keywords: 'image photo picture gallery' },
  { id: 'refresh', keywords: 'refresh reload sync rotate' },
  { id: 'arrow-left', keywords: 'arrow left back previous' },
  { id: 'arrow-right', keywords: 'arrow right next forward' },
  { id: 'grid-four', keywords: 'grid dashboard apps' },
  { id: 'lock', keywords: 'lock security privacy' },
  { id: 'chat-bubble', keywords: 'chat message comment' },
  { id: 'clock', keywords: 'clock time timer history' },
  { id: 'pause-circle', keywords: 'pause media wait' },
  { id: 'zap', keywords: 'zap bolt lightning flash action' },
  { id: 'maximize', keywords: 'maximize fullscreen expand' },
  { id: 'apps-plus', keywords: 'apps grid add widget' },
  { id: 'hexagon-nut', keywords: 'settings gear config nut' },
  { id: 'minimize', keywords: 'minimize shrink window' },
  { id: 'moon', keywords: 'moon dark night sleep' },
  { id: 'framer-bolt', keywords: 'framer bolt design' },
  { id: 'database', keywords: 'database storage server' },
  { id: 'play-triangle', keywords: 'play start run triangle' },
  { id: 'num-0', keywords: '0 zero number' },
  { id: 'num-1', keywords: '1 one number' },
  { id: 'num-2', keywords: '2 two number' },
  { id: 'num-3', keywords: '3 three number' },
  { id: 'num-4', keywords: '4 four number' },
  { id: 'num-5', keywords: '5 five number' },
  { id: 'num-6', keywords: '6 six number' },
  { id: 'num-7', keywords: '7 seven number' },
  { id: 'num-8', keywords: '8 eight number' },
  { id: 'num-9', keywords: '9 nine number' },
  { id: 'terminal', keywords: 'terminal command cmd shell' },
  { id: 'volume', keywords: 'volume audio sound speaker' },
];

const CURATED_ICON_IDS = new Set(CURATED_ICON_LIST.map(({ id }) => id));
let cachedIconSource: IconLibrary['l'] | undefined;
let cachedIconPaths: IconLibrary['d'] | undefined;
let cachedIconCatalog: IconCatalogItem[] | undefined;
const iconMetadataIndexes = new WeakMap<
  Record<string, IconMetadataEntry>,
  Map<string, IconMetadataEntry>
>();

export function buildIconCatalog(library?: IconLibrary): IconCatalogItem[] {
  if (
    cachedIconCatalog &&
    cachedIconSource === library?.l &&
    cachedIconPaths === library?.d
  ) {
    return cachedIconCatalog;
  }

  const iconsById = new Map<string, IconCatalogItem>(
    CURATED_ICON_LIST.map((icon) => [icon.id, icon])
  );

  if (library?.l && library.d) {
    for (const metadata of Object.values(library.l)) {
      if (!metadata.id || !library.d[metadata.id]) continue;

      const searchableKeywords = `${metadata.id.replaceAll('-', ' ')} ${metadata.k ?? ''}`
        .trim()
        .toLowerCase();
      const existing = iconsById.get(metadata.id);
      iconsById.set(metadata.id, {
        id: metadata.id,
        keywords: existing
          ? `${existing.keywords} ${searchableKeywords}`
          : searchableKeywords,
      });
    }
  }

  const curatedIcons = CURATED_ICON_LIST.map(({ id }) => iconsById.get(id)!);
  const remainingIcons = [...iconsById.values()]
    .filter(({ id }) => !CURATED_ICON_IDS.has(id))
    .sort((left, right) => left.id.localeCompare(right.id));

  cachedIconSource = library?.l;
  cachedIconPaths = library?.d;
  cachedIconCatalog = [...curatedIcons, ...remainingIcons];
  return cachedIconCatalog;
}

export function searchIconCatalog(
  catalog: IconCatalogItem[],
  query: string,
  limit = ICON_SEARCH_PAGE_SIZE,
  includeFullCatalog = false,
  offset = 0
): IconSearchResults {
  const normalizedQuery = query.trim().toLowerCase();
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const source =
    normalizedQuery || includeFullCatalog
      ? catalog
      : catalog.filter(({ id }) => CURATED_ICON_IDS.has(id));

  const matches = source
    .map((icon) => {
      const normalizedId = icon.id.toLowerCase();
      const searchableText = `${normalizedId.replaceAll('-', ' ')} ${icon.keywords}`;
      if (
        queryTerms.some((term) => !searchableText.includes(term))
      ) {
        return undefined;
      }

      const score = normalizedQuery
        ? (normalizedId === normalizedQuery ? 1_000 : 0) +
          (normalizedId.startsWith(normalizedQuery) ? 500 : 0) +
          (normalizedId.includes(normalizedQuery) ? 200 : 0) +
          queryTerms.reduce(
            (total, term) => total + (normalizedId.includes(term) ? 25 : 0),
            0
          )
        : 0;
      return { icon, score };
    })
    .filter((result): result is { icon: IconCatalogItem; score: number } =>
      result !== undefined
    )
    .sort((left, right) =>
      normalizedQuery
        ? right.score - left.score || left.icon.id.localeCompare(right.icon.id)
        : 0
    );

  return {
    icons: matches
      .slice(Math.max(0, offset), Math.max(0, offset) + Math.max(0, limit))
      .map(({ icon }) => icon),
    total: matches.length,
    query: normalizedQuery,
  };
}

export function findIconMetadata(
  library: IconLibrary | undefined,
  iconId: string
): IconMetadataEntry | undefined {
  if (!library?.l) return undefined;

  let index = iconMetadataIndexes.get(library.l);
  if (!index) {
    index = new Map();
    for (const metadata of Object.values(library.l)) {
      const current = index.get(metadata.id);
      if (!current || metadata.t === 'f') index.set(metadata.id, metadata);
    }
    iconMetadataIndexes.set(library.l, index);
  }

  return index.get(iconId);
}
