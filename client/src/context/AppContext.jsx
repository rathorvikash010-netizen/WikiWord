import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../services/api';

const AppContext = createContext();

let toastIdCounter = 0;

export function AppProvider({ children }) {
  const { isAuthenticated, user } = useAuth();

  // Daily words (paginated from DailyWord collection)
  const [dailyWords, setDailyWords] = useState([]);
  const [dailyWordsMeta, setDailyWordsMeta] = useState({ page: 1, limit: 6, total: 0, totalPages: 0 });
  const [dailyPage, setDailyPage] = useState(1);

  // User personal data
  const [bookmarkedWords, setBookmarkedWords] = useState([]);
  const [revisionWords, setRevisionWords] = useState([]);
  const [learnedWords, setLearnedWords] = useState([]);
  const [streak, setStreak] = useState({ count: 0, lastDate: '' });
  const [stats, setStats] = useState({
    totalWordsLearned: 0,
    wordsSaved: 0,
    dailyStreak: 0,
    quizAccuracy: 0,
    revisionsDone: 0,
    quizzesTaken: 0,
    totalQuizScore: 0,
  });
  const [weeklyData, setWeeklyData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ──── Load data when authenticated ────
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ──── Load daily words when page changes ────
  useEffect(() => {
    if (isAuthenticated) {
      loadDailyWords(dailyPage);
    }
  }, [dailyPage, isAuthenticated]);

  const loadDailyWords = async (page = 1) => {
    try {
      const res = await api.dailyWords.get(page, 6, true);
      setDailyWords(res.data || []);
      setDailyWordsMeta(res.meta || { page: 1, limit: 6, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to load daily words:', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        dailyWordsRes,
        bookmarksRes,
        revisionRes,
        streakRes,
        statsRes,
        weeklyRes,
        activitiesRes,
        quizRes,
        learnedRes,
      ] = await Promise.all([
        api.dailyWords.get(1, 6, true),
        api.bookmarks.getAll(),
        api.revision.getAll(),
        api.streak.get(),
        api.stats.get(),
        api.stats.getWeekly(),
        api.activities.get(),
        api.quiz.getResults(),
        api.learned.getAll().catch(() => ({ data: [] })),
      ]);

      setDailyWords(dailyWordsRes.data || []);
      setDailyWordsMeta(dailyWordsRes.meta || { page: 1, limit: 6, total: 0, totalPages: 0 });
      setBookmarkedWords(bookmarksRes.data || []);
      setRevisionWords(revisionRes.data || []);
      setStreak(streakRes.data || { count: 0, lastDate: '' });
      setStats(statsRes.data || stats);
      setWeeklyData(weeklyRes.data || []);
      setActivities(activitiesRes.data || []);
      setQuizResults(quizRes.data || []);
      setLearnedWords(learnedRes.data || []);

    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ──── Refresh helpers ────
  const refresh = async (apiFn, setter, fallback) => {
    try {
      const res = await apiFn();
      setter(res.data || fallback);
    } catch {}
  };

  const refreshBookmarks = () => refresh(api.bookmarks.getAll, setBookmarkedWords, []);
  const refreshRevision = () => refresh(api.revision.getAll, setRevisionWords, []);
  const refreshLearnedWords = () => refresh(api.learned.getAll, setLearnedWords, []);

  const refreshAllStats = useCallback(() => {
    refresh(api.stats.get, setStats, stats);
    refresh(api.stats.getWeekly, setWeeklyData, []);
    refresh(api.activities.get, setActivities, []);
    refresh(api.streak.get, setStreak, { count: 0, lastDate: '' });
  }, []);

  // ──── Actions ────

  /**
   * Toggle bookmark on a word. Sends full word data to backend.
   * wordData = { word, partOfSpeech, definition, pronunciation, example, synonyms, antonyms }
   */
  const toggleBookmark = useCallback(async (wordData) => {
    if (!isAuthenticated) return;

    const isCurrentlyBookmarked = bookmarkedWords.some(
      (bw) => bw.word.toLowerCase() === wordData.word.toLowerCase()
    );

    // Optimistic update — instant UI feedback
    if (isCurrentlyBookmarked) {
      setBookmarkedWords((prev) =>
        prev.filter((bw) => bw.word.toLowerCase() !== wordData.word.toLowerCase())
      );
      addToast(`"${wordData.word}" unbookmarked`, 'info');
    } else {
      setBookmarkedWords((prev) => [...prev, wordData]);
      addToast(`"${wordData.word}" bookmarked`, 'success');
    }

    // Background API call — revert on failure
    try {
      if (isCurrentlyBookmarked) {
        await api.bookmarks.remove(wordData.word);
      } else {
        await api.bookmarks.add(wordData);
      }
      refreshAllStats();
    } catch (err) {
      console.error('Bookmark toggle failed:', err);
      // Revert optimistic update
      if (isCurrentlyBookmarked) {
        refreshBookmarks();
      } else {
        setBookmarkedWords((prev) =>
          prev.filter((bw) => bw.word.toLowerCase() !== wordData.word.toLowerCase())
        );
      }
      addToast('Failed to update bookmark', 'warning');
    }
  }, [isAuthenticated, bookmarkedWords, addToast, refreshAllStats]);

  /**
   * Toggle revision on a word. Sends full word data to backend.
   */
  const toggleRevision = useCallback(async (wordData) => {
    if (!isAuthenticated) return;

    const isCurrentlyInRevision = revisionWords.some(
      (rw) => rw.word.toLowerCase() === wordData.word.toLowerCase()
    );

    // Optimistic update — instant UI feedback
    if (isCurrentlyInRevision) {
      setRevisionWords((prev) =>
        prev.filter((rw) => rw.word.toLowerCase() !== wordData.word.toLowerCase())
      );
      addToast(`"${wordData.word}" removed from revision`, 'info');
    } else {
      setRevisionWords((prev) => [...prev, wordData]);
      addToast(`"${wordData.word}" added to revision list`, 'success');
    }

    // Background API call — revert on failure
    try {
      if (isCurrentlyInRevision) {
        await api.revision.remove(wordData.word);
      } else {
        await api.revision.add(wordData);
      }
      refreshAllStats();
    } catch (err) {
      console.error('Revision toggle failed:', err);
      // Revert optimistic update
      if (isCurrentlyInRevision) {
        refreshRevision();
      } else {
        setRevisionWords((prev) =>
          prev.filter((rw) => rw.word.toLowerCase() !== wordData.word.toLowerCase())
        );
      }
      addToast('Failed to update revision', 'warning');
    }
  }, [isAuthenticated, revisionWords, addToast, refreshAllStats]);

  /**
   * Mark a word as learned (from revision list).
   */
  const markWordLearned = useCallback(async (wordText) => {
    if (!isAuthenticated) return;

    // Optimistic update — instant UI feedback
    setRevisionWords((prev) =>
      prev.map((rw) =>
        rw.word.toLowerCase() === wordText.toLowerCase()
          ? { ...rw, isLearned: true }
          : rw
      )
    );
    addToast(`"${wordText}" marked as learned!`, 'success');

    // Background API call — revert on failure
    try {
      await api.revision.markLearned(wordText);
      refreshLearnedWords();
      refreshAllStats();
    } catch (err) {
      console.error('Mark learned failed:', err);
      // Revert optimistic update
      setRevisionWords((prev) =>
        prev.map((rw) =>
          rw.word.toLowerCase() === wordText.toLowerCase()
            ? { ...rw, isLearned: false }
            : rw
        )
      );
      addToast('Failed to mark as learned', 'warning');
    }
  }, [isAuthenticated, addToast, refreshAllStats]);

  /**
   * Review a word with spaced repetition quality.
   * quality: 0=again, 1=hard, 2=good, 3=easy
   */
  const reviewWord = useCallback(async (wordText, quality) => {
    if (!isAuthenticated) return null;

    try {
      const res = await api.revision.review(wordText, quality);
      // Update local state with new review data
      setRevisionWords((prev) =>
        prev.map((rw) =>
          rw.word.toLowerCase() === wordText.toLowerCase()
            ? { ...rw, interval: res.data.interval, nextReview: res.data.nextReview, reviewCount: res.data.reviewCount }
            : rw
        )
      );
      addToast(res.message || `Reviewed! Next in ${res.data.interval} day${res.data.interval !== 1 ? 's' : ''}`, 'success');
      refreshAllStats();
      return res.data;
    } catch (err) {
      console.error('Review failed:', err);
      addToast('Failed to record review', 'warning');
      return null;
    }
  }, [isAuthenticated, addToast, refreshAllStats]);

  /**
   * Check if a word is bookmarked (by word text).
   */
  const isBookmarked = useCallback((wordText) => {
    return bookmarkedWords.some(
      (bw) => bw.word.toLowerCase() === wordText.toLowerCase()
    );
  }, [bookmarkedWords]);

  /**
   * Check if a word is in revision (by word text).
   */
  const isInRevision = useCallback((wordText) => {
    return revisionWords.some(
      (rw) => rw.word.toLowerCase() === wordText.toLowerCase()
    );
  }, [revisionWords]);

  /**
   * Check if a word is learned (by word text).
   */
  const isLearned = useCallback((wordText) => {
    // Check revision words with isLearned flag
    const revLearned = revisionWords.some(
      (rw) => rw.word.toLowerCase() === wordText.toLowerCase() && rw.isLearned
    );
    if (revLearned) return true;
    // Check dedicated learned words
    return learnedWords.some(
      (lw) => (lw.word || '').toLowerCase() === wordText.toLowerCase()
    );
  }, [revisionWords, learnedWords]);

  const submitQuiz = useCallback(async (score, total, answers) => {
    if (!isAuthenticated) return null;

    try {
      const res = await api.quiz.submit({ score, total, answers });
      setQuizResults((prev) => [res.data, ...prev].slice(0, 50));
      refreshAllStats();
      return res.data;
    } catch (err) {
      console.error('Submit quiz failed:', err);
      return null;
    }
  }, [isAuthenticated, refreshAllStats]);

  const goToDailyPage = useCallback((page) => {
    setDailyPage(page);
  }, []);

  const value = {
    // Daily words
    dailyWords,
    dailyWordsMeta,
    dailyPage,
    goToDailyPage,

    // User personal data
    bookmarkedWords,
    revisionWords,
    learnedWords,
    quizResults,
    streak,
    activities,
    stats,
    weeklyData,
    loading,

    // Actions
    toggleBookmark,
    toggleRevision,
    markWordLearned,
    reviewWord,
    isBookmarked,
    isInRevision,
    isLearned,
    submitQuiz,
    refreshData: loadAllData,

    // Toast
    toasts,
    addToast,
    removeToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export default AppContext;
