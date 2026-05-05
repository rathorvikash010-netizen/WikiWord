/**
 * API service — handles all HTTP requests to the backend.
 * Manages access token and auto-refresh on 401.
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://edicto.onrender.com/api';

let accessToken = null;
let refreshPromise = null; // Prevents multiple simultaneous refresh calls

export function setAccessToken(token) {
  accessToken = token;
}


export function clearAccessToken() {
  accessToken = null;
}

/**
 * Core request function with auto-refresh on 401.
 */
async function request(path, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
    credentials: 'include', // send cookies (refresh token)
    ...options,
  };

  // Don't override body if it's already set
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  let response = await fetch(`${API_URL}${path}`, config);

  // Auto-refresh on 401 (but not for auth endpoints)
  if (response.status === 401 && accessToken && !path.includes('/auth/')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      response = await fetch(`${API_URL}${path}`, config);
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Refresh the access token using the HTTP-only cookie.
 */
async function tryRefreshToken() {
  // Deduplicate simultaneous refresh calls
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        clearAccessToken();
        return false;
      }
      const data = await res.json();
      accessToken = data.data.accessToken;
      return true;
    } catch {
      clearAccessToken();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ──── Auth ────
export const auth = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  refresh: () => tryRefreshToken(),
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body }),
};

// ──── Words ────
export const words = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/words${query ? `?${query}` : ''}`);
  },
  getById: (id) => request(`/words/${id}`),
};

// ──── Daily Words (new — paginated shared words) ────
export const dailyWords = {
  get: (page = 1, limit = 6, todayOnly = false) => request(`/daily-words?page=${page}&limit=${limit}${todayOnly ? '&today=true' : ''}`),
  getAll: () => request('/daily-words/all'),
  getWordOfDay: () => request('/daily-words/word-of-day'),
};

// ──── Search ────
export const search = {
  query: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  suggest: (q) => request(`/search/suggest?q=${encodeURIComponent(q)}`),
};

// ──── Bookmarks (new — full word data) ────
export const bookmarks = {
  getAll: () => request('/bookmarks'),
  add: (wordData) => request('/bookmarks', { method: 'POST', body: wordData }),
  remove: (word) => request(`/bookmarks/${encodeURIComponent(word)}`, { method: 'DELETE' }),
  getStatus: (word) => request(`/bookmarks/status/${encodeURIComponent(word)}`),
};



// ──── Revision (new — full word data) ────
export const revision = {
  getAll: () => request('/revision'),
  add: (wordData) => request('/revision', { method: 'POST', body: wordData }),
  remove: (word) => request(`/revision/${encodeURIComponent(word)}`, { method: 'DELETE' }),
  markLearned: (word) => request(`/revision/${encodeURIComponent(word)}/learned`, { method: 'PUT' }),
  review: (word, quality) => request(`/revision/${encodeURIComponent(word)}/review`, { method: 'PUT', body: { quality } }),
};

// ──── Learned ────
export const learned = {
  getAll: () => request('/learned'),
};

// ──── Quiz ────
export const quiz = {
  generate: () => request('/quiz/generate', { method: 'POST' }),
  submit: (body) => request('/quiz/submit', { method: 'POST', body }),
  getResults: () => request('/quiz/results'),
  retry: () => request('/quiz/retry', { method: 'POST' }),
};

// ──── Streak ────
export const streak = {
  get: () => request('/streak'),
};

// ──── Activities ────
export const activities = {
  get: () => request('/activities'),
};

// ──── Stats ────
export const stats = {
  get: () => request('/stats'),
  getWeekly: () => request('/stats/weekly'),
};

// ──── Leaderboard ────
export const leaderboard = {
  get: () => request('/leaderboard'),
};

export default {
  auth,
  words,
  dailyWords,
  search,
  bookmarks,
  learned,
  revision,
  quiz,
  streak,
  activities,
  stats,
  leaderboard,
};
