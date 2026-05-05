const asyncHandler = require('../middleware/asyncHandler');
const dailyWordService = require('../services/dailyWord.service');
const ApiResponse = require('../utils/ApiResponse');
const { LIMITS } = require('../constants');

/**
 * GET /api/daily-words?page=1&limit=6
 */
const getDailyWords = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || LIMITS.DAILY_WORDS_PER_PAGE;
  const todayOnly = req.query.today === 'true';

  const result = await dailyWordService.getDailyWords(page, limit, todayOnly);

  ApiResponse.success(res, {
    data: result.words,
    meta: result.meta,
  });
});

/**
 * GET /api/daily-words/all — returns ALL words without pagination (for Browse)
 */
const getAllDailyWords = asyncHandler(async (req, res) => {
  const words = await dailyWordService.getAllDailyWords();

  ApiResponse.success(res, { data: words });
});

/**
 * GET /api/daily-words/by-day — returns words grouped by fetchDay
 * 
 * Response shape:
 * {
 *   data: [
 *     { day: "2026-04-14", label: "Today", wordCount: 60, expiresOn: "2026-04-24", words: [...] },
 *     { day: "2026-04-13", label: "Yesterday", wordCount: 60, expiresOn: "2026-04-23", words: [...] },
 *     ...
 *   ]
 * }
 */
const getDailyWordsByDay = asyncHandler(async (req, res) => {
  const dayGroups = await dailyWordService.getDailyWordsByDay();

  ApiResponse.success(res, { data: dayGroups });
});

/**
 * GET /api/daily-words/word-of-day — returns the Word of the Day
 */
const getWordOfTheDay = asyncHandler(async (req, res) => {
  const word = await dailyWordService.getWordOfTheDay();

  if (!word) {
    return ApiResponse.success(res, { data: null, message: 'No words available yet' });
  }

  ApiResponse.success(res, { data: word });
});

/**
 * GET /api/daily-words/count
 */
const getDailyWordCount = asyncHandler(async (req, res) => {
  const count = await dailyWordService.getDailyWordCount();

  ApiResponse.success(res, {
    data: { count },
  });
});

/**
 * GET /api/daily-words/status — fetch status info (admin/debug)
 */
const getFetchStatus = asyncHandler(async (req, res) => {
  const status = await dailyWordService.getFetchStatus();

  ApiResponse.success(res, { data: status });
});

module.exports = { getDailyWords, getAllDailyWords, getDailyWordsByDay, getWordOfTheDay, getDailyWordCount, getFetchStatus };
