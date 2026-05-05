import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';
import { FiZap, FiChevronRight, FiChevronLeft, FiVolume2, FiBookmark, FiRefreshCw, FiBookOpen, FiInbox } from 'react-icons/fi';
import usePronunciation from '../hooks/usePronunciation';
import UnifiedWordCard from '../components/word/UnifiedWordCard';

export default function DailyWord() {
  const {
    dailyWords, dailyWordsMeta, dailyPage, goToDailyPage,
    streak, loading, toggleBookmark, toggleRevision, isBookmarked, isInRevision,
  } = useApp();
  const { speak, speaking } = usePronunciation();
  const navigate = useNavigate();

  const [wordOfDay, setWordOfDay] = useState(null);
  const [wotdLoading, setWotdLoading] = useState(true);

  // Fetch Word of the Day
  useEffect(() => {
    (async () => {
      try {
        const res = await api.dailyWords.getWordOfDay();
        setWordOfDay(res.data);
      } catch (err) {
        console.error('Failed to load WOTD:', err);
      } finally {
        setWotdLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading today's words...
        </div>
      </div>
    );
  }

  const { page, totalPages, total } = dailyWordsMeta;
  const startIdx = (page - 1) * 6 + 1;
  const endIdx = Math.min(page * 6, total);

  const handleNext = () => {
    if (dailyPage < totalPages) goToDailyPage(dailyPage + 1);
  };

  const handlePrev = () => {
    if (dailyPage > 1) goToDailyPage(dailyPage - 1);
  };

  const getWordData = (w) => ({
    word: w.word,
    partOfSpeech: w.partOfSpeech || '',
    definition: w.definition || w.meaning || '',
    pronunciation: w.pronunciation || '',
    example: w.example || '',
    synonyms: w.synonyms || [],
    antonyms: w.antonyms || [],
  });

  const wotdBookmarked = wordOfDay ? isBookmarked(wordOfDay.word) : false;
  const wotdInRevision = wordOfDay ? isInRevision(wordOfDay.word) : false;

  return (
    <div className="page-container">
      {/* Streak Banner */}
      <div className="animate-fade-in" style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: 'var(--space-xl)', padding: '12px 20px',
        background: 'linear-gradient(135deg, rgba(123,47,242,0.08), rgba(228,75,194,0.06))',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(123,47,242,0.12)'
      }}>
        <FiZap style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          You're on a <strong style={{ color: 'var(--accent-primary)' }}>{streak.count}-day</strong> learning streak! Keep it up!
        </span>
      </div>

      {/* Word of the Day */}
      <div className="section-header">
        <div>
          <h2 className="section-title">
            <FiBookOpen style={{ marginRight: '8px', verticalAlign: '-2px' }} />
            Word of the Day
          </h2>
          <p className="section-subtitle">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {wotdLoading ? (
        <div className="skeleton skeleton-card" style={{ height: '200px', marginBottom: 'var(--space-2xl)' }} />
      ) : wordOfDay ? (
        <div className="word-card-full animate-scale-in" style={{ marginBottom: 'var(--space-2xl)' }}>
          <div className="word-title-section">
            <h1 className="word-main-title">{wordOfDay.word}</h1>
            <div className="word-phonetic">
              <button
                className={`word-audio-btn btn-icon ${speaking ? 'audio-playing' : ''}`}
                title="Listen to pronunciation"
                onClick={() => speak(wordOfDay.word, wordOfDay.audioUrl)}
              >
                <FiVolume2 />
              </button>
              <span>{wordOfDay.pronunciation}</span>
            </div>
            {wordOfDay.partOfSpeech && (
              <span className="word-pos-badge">{wordOfDay.partOfSpeech}</span>
            )}
          </div>

          <div className="word-meaning-section">
            <div className="word-section-label">Definition</div>
            <p className="word-meaning-text">{wordOfDay.definition}</p>
          </div>

          {wordOfDay.example && (
            <div className="word-example-box">
              <div className="word-section-label" style={{ marginBottom: '8px' }}>Example</div>
              <p className="word-example-text">"{wordOfDay.example}"</p>
            </div>
          )}

          {wordOfDay.synonyms && wordOfDay.synonyms.length > 0 && (
            <div style={{ marginTop: 'var(--space-lg)' }}>
              <div className="word-section-label">Synonyms</div>
              <div className="word-synonyms">
                {wordOfDay.synonyms.map(syn => (
                  <span
                    key={syn}
                    className="word-synonym-chip clickable-chip"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(syn)}`)}
                    title={`Look up "${syn}"`}
                  >
                    {syn}
                  </span>
                ))}
              </div>
            </div>
          )}

          {wordOfDay.antonyms && wordOfDay.antonyms.length > 0 && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              <div className="word-section-label">Antonyms</div>
              <div className="word-synonyms">
                {wordOfDay.antonyms.map(ant => (
                  <span
                    key={ant}
                    className="word-synonym-chip antonym clickable-chip"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(ant)}`)}
                    title={`Look up "${ant}"`}
                  >
                    {ant}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="word-actions">
            <button
              className={`btn ${wotdBookmarked ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => toggleBookmark(getWordData(wordOfDay))}
            >
              <FiBookmark fill={wotdBookmarked ? 'currentColor' : 'none'} />
              {wotdBookmarked ? 'Unbookmark' : 'Bookmark'}
            </button>
            <button
              className={`btn ${wotdInRevision ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => toggleRevision(getWordData(wordOfDay))}
            >
              <FiRefreshCw />
              {wotdInRevision ? 'In Revision' : 'Add to Revision'}
            </button>
          </div>
        </div>
      ) : null}

      {/* Explore More Words (paginated 6/page) */}
      {dailyWords.length > 0 && (
        <>
          <div className="section-header">
            <div>
              <h3 className="section-title">Explore More Words</h3>
              <p className="section-subtitle">
                {total > 0 ? `Showing ${startIdx}–${endIdx} of ${total} words added today` : 'Loading...'}
              </p>
            </div>
          </div>

          <div className="word-grid">
            {dailyWords.map((word, index) => (
              <UnifiedWordCard
                key={word._id || index}
                word={word}
                variant="explore"
                className={`stagger-${Math.min(index + 1, 6)}`}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="explore-pagination">
            <button className="btn btn-ghost" onClick={handlePrev} disabled={dailyPage <= 1}>
              <FiChevronLeft /> Previous
            </button>
            <span className="explore-page-indicator">
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-primary" onClick={handleNext} disabled={dailyPage >= totalPages}>
              Next <FiChevronRight />
            </button>
          </div>
        </>
      )}

      {/* Empty state */}
      {dailyWords.length === 0 && !wordOfDay && (
        <div className="empty-state">
          <div className="empty-state-icon"><FiInbox size={48} /></div>
          <h3 className="empty-state-title">No daily words yet</h3>
          <p className="empty-state-desc">
            Words are being fetched from the dictionary. Please check back in a moment.
          </p>
        </div>
      )}
    </div>
  );
}
