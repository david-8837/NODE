import { CURATED_ICON_LIST, type IconLibrary } from './iconCatalog';

const FULL_ICON_LIBRARY_PATH_COUNT = 8_475; // Full paths in the checked-in library.
const CURATED_ICON_IDS = new Set(CURATED_ICON_LIST.map(({ id }) => id));
let iconLibraryPromise: Promise<IconLibrary> | undefined;

declare global {
  interface Window {
    __MACRO_ICONS__?: IconLibrary;
    __MACRO_ICON_BOOTSTRAP__?: IconLibrary;
    __PRESET_BRAND_ICON_DATA__?: IconLibrary;
    __MACRO_ICON_LIBRARY_READY__?: boolean;
  }
}

export function getMacroIconLibrary(): IconLibrary | undefined {
  return typeof window === 'undefined' ? undefined : window.__MACRO_ICONS__;
}

export function hasSavedIconOutsideStartupCatalog(serializedState: string | null): boolean {
  if (!serializedState || typeof window === 'undefined') return false;

  let savedState: unknown;
  try {
    savedState = JSON.parse(serializedState);
  } catch {
    return false;
  }

  const startupPaths = window.__MACRO_ICONS__?.d ?? {};
  const pendingValues: unknown[] = [savedState];
  while (pendingValues.length > 0) {
    const value = pendingValues.pop();
    if (Array.isArray(value)) {
      pendingValues.push(...value);
      continue;
    }
    if (!value || typeof value !== 'object') continue;

    for (const [key, child] of Object.entries(value)) {
      if (
        key === 'iconId' &&
        typeof child === 'string' &&
        child.length > 0 &&
        !startupPaths[child] &&
        !CURATED_ICON_IDS.has(child)
      ) {
        return true;
      }
      pendingValues.push(child);
    }
  }

  return false;
}

function isFullIconLibrary(library: IconLibrary | undefined): library is IconLibrary & {
  d: Record<string, string>;
} {
  return Object.keys(library?.d ?? {}).length >= FULL_ICON_LIBRARY_PATH_COUNT;
}

function entriesOf<T>(entries: T[] | Record<string, T> | undefined): T[] {
  return entries ? Object.values(entries) : [];
}

function mergeStartupIcons(fullLibrary: IconLibrary): IconLibrary {
  const fullPaths = fullLibrary.d ?? {};
  const fullIds = new Set(Object.keys(fullPaths));
  const paths = { ...fullPaths };
  const metadata = entriesOf(fullLibrary.l);
  const startupLibraries = [
    window.__MACRO_ICON_BOOTSTRAP__,
    window.__PRESET_BRAND_ICON_DATA__,
  ];

  for (const startupLibrary of startupLibraries) {
    if (!startupLibrary) continue;
    Object.entries(startupLibrary.d ?? {}).forEach(([id, iconPath]) => {
      if (!fullIds.has(id)) paths[id] = iconPath;
    });
    metadata.push(
      ...entriesOf(startupLibrary.l).filter(({ id }) => !fullIds.has(id))
    );
  }

  return { d: paths, l: metadata };
}

export function loadFullMacroIconLibrary(): Promise<IconLibrary> {
  const currentLibrary = getMacroIconLibrary();
  if (isFullIconLibrary(currentLibrary)) {
    if (window.__MACRO_ICON_LIBRARY_READY__) return Promise.resolve(currentLibrary);

    const mergedLibrary = mergeStartupIcons(currentLibrary);
    window.__MACRO_ICONS__ = mergedLibrary;
    window.__MACRO_ICON_LIBRARY_READY__ = true;
    return Promise.resolve(mergedLibrary);
  }
  if (iconLibraryPromise) return iconLibraryPromise;

  const load = new Promise<IconLibrary>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('icons-data.js', document.baseURI).href;
    script.async = true;
    script.onload = () => {
      const loadedLibrary = getMacroIconLibrary();
      if (!isFullIconLibrary(loadedLibrary)) {
        script.remove();
        reject(new Error('The full icon catalog did not load correctly.'));
        return;
      }

      const mergedLibrary = mergeStartupIcons(loadedLibrary);
      window.__MACRO_ICONS__ = mergedLibrary;
      window.__MACRO_ICON_LIBRARY_READY__ = true;
      script.remove();
      resolve(mergedLibrary);
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Could not load the full icon catalog.'));
    };
    document.head.append(script);
  });

  iconLibraryPromise = load.catch((error: unknown) => {
    iconLibraryPromise = undefined;
    throw error;
  });
  return iconLibraryPromise;
}
