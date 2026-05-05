/**
 * Daily Word Service
 * 
 * Rolling daily word system:
 * - Each day: fetch 60 new words from the Free Dictionary API
 * - Words accumulate: Day1=60, Day2=120, ... Day10=600 words visible
 * - On Day 11: Day 1's words auto-expire (MongoDB TTL), new 60 fetched
 * - Uses FetchState to track position in WORD_LIST (circular)
 * - Idempotent: skips if today's batch is already fetched
 */

const DailyWord = require('../models/DailyWord');
const FetchState = require('../models/FetchState');
const { fetchWord } = require('./dictionary.service');
const { WORD_LIST } = require('../constants/wordList');
const { LIMITS } = require('../constants');

const FETCH_STATE_KEY = 'daily_word_fetcher';

/**
 * Get today's date as YYYY-MM-DD string.
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Fetch and store today's batch of daily words.
 * 
 * Logic:
 * 1. Check FetchState — if lastFetchDate === today, skip (already done)
 * 2. Get nextBatchIndex from FetchState
 * 3. Slice 60 words from WORD_LIST starting at nextBatchIndex (wraps around)
 * 4. Fetch each from Free Dictionary API
 * 5. Save with fetchDay=today, expiresAt=today+10days
 * 6. Update FetchState
 */
async function fetchAndStoreDailyWords() {
  const today = getTodayString();

  // ── 1. Check if we already fetched today ──
  let state = await FetchState.findOne({ key: FETCH_STATE_KEY });
  if (!state) {
    state = await FetchState.create({
      key: FETCH_STATE_KEY,
      nextBatchIndex: 0,
      lastFetchDate: '',
    });
    console.log('[INFO] Created new FetchState tracker');
  }

  if (state.lastFetchDate === today) {
    const currentCount = await DailyWord.countDocuments();
    console.log(`\n[OK] Already fetched today's words (${today}). ${currentCount} total words in DB. Skipping.\n`);
    return;
  }

  // ── 2. Determine which words to fetch (DB-verified unique) ──
  const batchSize = LIMITS.DAILY_WORDS_FETCH_COUNT; // 60
  const listLength = WORD_LIST.length;
  let startIndex = state.nextBatchIndex;

  // Load all words currently in DailyWord collection to check for duplicates
  const existingDailyWords = await DailyWord.find().select('word').lean();
  const existingSet = new Set(existingDailyWords.map((w) => w.word.toLowerCase()));
  console.log(`   [SCAN] ${existingSet.size} words currently in DB -- will skip duplicates`);

  // Build the batch by scanning through the list, skipping words already in DB
  const toFetch = [];
  let scanned = 0;
  let currentIndex = startIndex;

  while (toFetch.length < batchSize && scanned < listLength) {
    const index = currentIndex % listLength;
    const candidate = WORD_LIST[index];

    if (!existingSet.has(candidate.word.toLowerCase())) {
      toFetch.push(candidate);
    }

    currentIndex++;
    scanned++;
  }

  if (toFetch.length === 0) {
    console.log('[WARN] All words from the list are already in DB. No new words to fetch.');
    // Still update lastFetchDate so we don't retry endlessly
    state.lastFetchDate = today;
    await state.save();
    return;
  }

  if (toFetch.length < batchSize) {
    console.log(`[WARN] Only ${toFetch.length} unique words available (${batchSize - toFetch.length} were duplicates)`);
  }

  // Update nextBatchIndex to where we stopped scanning
  const newNextIndex = currentIndex % listLength;

  console.log(`\n[FETCH] Day's batch: ${toFetch.length} words from Free Dictionary API...`);
  console.log(`   FetchDay: ${today} | Starting at WORD_LIST[${startIndex}]`);
  console.log(`   Words will expire on: ${getExpiryDate(today)}\n`);

  // ── 3. Fetch and save each word ──
  const retentionMs = LIMITS.DAILY_WORD_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const meta = toFetch[i];
    const progress = `[${i + 1}/${toFetch.length}]`;

    try {
      const result = await fetchWord(meta.word, {
        category: meta.category,
        difficulty: meta.difficulty,
      });

      if (result.error) {
        console.log(`${progress} [WARN] ${meta.word}: ${result.error}`);
        failed++;
        continue;
      }

      const now = new Date();
      await DailyWord.create({
        word: result.word,
        partOfSpeech: result.partOfSpeech || '',
        definition: result.meaning || '',
        pronunciation: result.pronunciation || '',
        example: result.example || '',
        synonyms: result.synonyms || [],
        antonyms: [],
        category: meta.category || 'GRE',
        difficulty: meta.difficulty || null,
        fetchDay: today,
        fetchedAt: now,
        expiresAt: new Date(now.getTime() + retentionMs),
      });

      console.log(`${progress} [OK] ${result.word}`);
      inserted++;
    } catch (err) {
      if (err.code === 11000) {
        console.log(`${progress} [SKIP] ${meta.word} -- already exists for ${today}`);
      } else {
        console.log(`${progress} [FAIL] ${meta.word}: ${err.message}`);
        failed++;
      }
    }

    // Rate limit: 300ms between API calls
    if (i < toFetch.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // ── 4. Update FetchState (newNextIndex was computed during scan) ──
  state.nextBatchIndex = newNextIndex;
  state.lastFetchDate = today;
  await state.save();

  const total = await DailyWord.countDocuments();
  console.log(`\n[DONE] +${inserted} new, ${failed} failed. Total daily words in DB: ${total}`);
  console.log(`   Next batch will start at WORD_LIST[${newNextIndex}]\n`);
}

/**
 * Get the expiry date string for a given fetch day.
 */
function getExpiryDate(fetchDay) {
  const date = new Date(fetchDay);
  date.setDate(date.getDate() + LIMITS.DAILY_WORD_RETENTION_DAYS);
  return date.toISOString().split('T')[0];
}

/**
 * Get paginated daily words (newest first).
 * If todayOnly is true, only return words fetched today.
 */
async function getDailyWords(page = 1, limit = LIMITS.DAILY_WORDS_PER_PAGE, todayOnly = false) {
  const skip = (page - 1) * limit;
  const filter = todayOnly ? { fetchDay: getTodayString() } : {};
  const [words, total] = await Promise.all([
    DailyWord.find(filter)
      .sort({ fetchedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DailyWord.countDocuments(filter),
  ]);

  return {
    words,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get ALL daily words (no pagination) for the Browse section.
 */
async function getAllDailyWords() {
  return DailyWord.find()
    .sort({ fetchedAt: -1 })
    .lean();
}

/**
 * Get daily words grouped by fetchDay.
 * Returns an array of day groups, newest day first.
 * 
 * Example response:
 * [
 *   { day: "2026-04-14", label: "Today", wordCount: 60, words: [...] },
 *   { day: "2026-04-13", label: "Yesterday", wordCount: 60, words: [...] },
 *   { day: "2026-04-12", label: "2 days ago", wordCount: 58, words: [...] },
 *   ...
 * ]
 */
async function getDailyWordsByDay() {
  const allWords = await DailyWord.find()
    .sort({ fetchedAt: -1 })
    .lean();

  if (allWords.length === 0) return [];

  // Group words by fetchDay
  const dayMap = new Map();
  for (const word of allWords) {
    const day = word.fetchDay;
    if (!dayMap.has(day)) {
      dayMap.set(day, []);
    }
    dayMap.get(day).push(word);
  }

  // Convert to sorted array (newest first) and add labels
  const today = getTodayString();
  const result = [];

  // Sort days in descending order
  const sortedDays = Array.from(dayMap.keys()).sort((a, b) => b.localeCompare(a));

  for (const day of sortedDays) {
    const words = dayMap.get(day);
    result.push({
      day,
      label: getDayLabel(day, today),
      wordCount: words.length,
      expiresOn: getExpiryDate(day),
      words,
    });
  }

  return result;
}

/**
 * Get a human-readable label for a fetch day.
 */
function getDayLabel(day, today) {
  const dayDate = new Date(day);
  const todayDate = new Date(today);
  const diffMs = todayDate.getTime() - dayDate.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${diffDays} days ago`;
}

/**
 * Get the Word of the Day.
 * Uses the current date as a seed so all users see the same word on the same day.
 */
async function getWordOfTheDay() {
  const allWords = await DailyWord.find().lean();
  if (allWords.length === 0) return null;

  // Use date string as a simple hash seed for deterministic selection
  const today = getTodayString();
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % allWords.length;
  return allWords[index];
}

/**
 * Get total count of daily words.
 */
async function getDailyWordCount() {
  return DailyWord.countDocuments();
}

/**
 * Get fetch status info — useful for admin/debugging.
 */
async function getFetchStatus() {
  const state = await FetchState.findOne({ key: FETCH_STATE_KEY }).lean();
  const totalWords = await DailyWord.countDocuments();
  const dayGroups = await DailyWord.aggregate([
    { $group: { _id: '$fetchDay', count: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);

  return {
    fetchState: state,
    totalWordsInDB: totalWords,
    daysActive: dayGroups.length,
    dayBreakdown: dayGroups.map((g) => ({ day: g._id, count: g.count })),
    wordListSize: WORD_LIST.length,
  };
}

/**
 * Backfill category and difficulty for existing DailyWords that don't have them.
 * Looks up each word in the WORD_LIST by name. Runs once on server start.
 */
async function backfillCategories() {
  const wordsWithoutCategory = await DailyWord.find({
    $or: [{ category: { $exists: false } }, { category: null }],
  }).lean();

  if (wordsWithoutCategory.length === 0) {
    console.log('[BACKFILL] All daily words already have categories.');
    return;
  }

  // Build a lookup map from WORD_LIST
  const wordMap = new Map();
  for (const item of WORD_LIST) {
    wordMap.set(item.word.toLowerCase(), item);
  }

  let updated = 0;
  for (const dw of wordsWithoutCategory) {
    const meta = wordMap.get(dw.word.toLowerCase());
    if (meta) {
      await DailyWord.updateOne(
        { _id: dw._id },
        { $set: { category: meta.category, difficulty: meta.difficulty } }
      );
      updated++;
    }
  }

  console.log(`[BACKFILL] Updated ${updated}/${wordsWithoutCategory.length} daily words with category/difficulty.`);
}

module.exports = {
  fetchAndStoreDailyWords,
  getDailyWords,
  getAllDailyWords,
  getDailyWordsByDay,
  getWordOfTheDay,
  getDailyWordCount,
  getFetchStatus,
  backfillCategories,
};
