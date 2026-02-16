/**
 * Sync localStorage changes to Supabase
 * Call this after updating localStorage data
 */
export async function syncToSupabase(table: string, data: any) {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-storage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ table, data }),
    });

    if (!response.ok) {
      console.warn(`Sync warning for ${table}:`, response.statusText);
    }
  } catch (error) {
    // Silently fail - localStorage is primary storage
    console.warn('Sync error (localStorage is primary):', error);
  }
}

/**
 * Fetch data from Supabase (fallback to localStorage)
 */
export async function fetchFromSupabase(
  table: string,
  localStorageKey: string,
  parseJson: boolean = true
) {
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const { VITE_SUPABASE_PUBLISHABLE_KEY } = import.meta.env;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?order=created_at.desc`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.warn(`Fetch error for ${table}, using localStorage:`, error);
  }

  // Fallback to localStorage
  const saved = localStorage.getItem(localStorageKey);
  if (saved && parseJson) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  }
  return saved ? [saved] : [];
}
