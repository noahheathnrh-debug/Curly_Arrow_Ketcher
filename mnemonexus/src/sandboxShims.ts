/**
 * Things a sandboxed frame does not have, which Ketcher assumes it does.
 *
 * An add-on runs in an iframe with an opaque origin, so the browser refuses it
 * `localStorage` and `sessionStorage` — not as a `null` but as a thrown
 * `SecurityError` on property *access*. Any library that reads settings from
 * storage therefore throws before it renders anything, which is what stopped the
 * editor drawing here.
 *
 * Both are replaced with in-memory equivalents. That is honest rather than a
 * workaround: a sandboxed add-on genuinely has no persistence, so preferences
 * last for the run and no longer. Nothing is silently written somewhere the user
 * cannot see.
 *
 * Imported before anything else in `packEntry.tsx`, because the modules that
 * read storage do so as they initialise.
 */

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>()

  return {
    get length() {
      return entries.size
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, String(value))
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
    clear: () => {
      entries.clear()
    },
  } as Storage
}

/** Does reading this property throw, rather than simply being absent? */
function isDenied(name: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[name]
    // Access alone can succeed while use still fails, so probe properly.
    storage.getItem('__probe__')
    return false
  } catch {
    return true
  }
}

if (typeof window !== 'undefined') {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    if (!isDenied(name)) continue

    Object.defineProperty(window, name, {
      value: createMemoryStorage(),
      configurable: true,
      writable: false,
    })
  }
}

export {}
