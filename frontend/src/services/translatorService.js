import * as wanakana from 'wanakana';
import { getHanViet } from '../utils/hanVietDict';

// In-memory translation cache (0ms lookup on repeated phrases)
const translationCache = new Map();

/**
 * Universal High-Speed Japanese to Vietnamese Translator Service
 * Combines Translation Engine + Hán Việt Dictionary + WanaKana transliteration.
 * 
 * @param {string} text Japanese word, phrase, or sentence
 * @returns {Promise<{
 *   sourceText: string,
 *   translatedText: string,
 *   romaji: string,
 *   hiragana: string,
 *   hanViet: string
 * }>}
 */
export const translateJapanese = async (text) => {
  const clean = (text || '').trim();
  if (!clean) return null;

  // 1. Check in-memory cache
  if (translationCache.has(clean)) {
    return translationCache.get(clean);
  }

  // Pre-calculate offline linguistic attributes (0.01ms)
  const hanViet = getHanViet(clean);
  const romaji = wanakana.toRomaji(clean);
  const hiragana = wanakana.toHiragana(clean);

  let translatedText = '';

  // 2. Try MyMemory Translation API (Fast, Free, No API key required)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=ja|vi`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const textResult = data?.responseData?.translatedText;
      if (textResult && typeof textResult === 'string' && !textResult.startsWith('MYMEMORY WARNING')) {
        translatedText = textResult;
      }
    }
  } catch (err) {
    console.debug('MyMemory translation fallback, trying secondary engine...', err.message);
  }

  // 3. Fallback: Try Google Translate public endpoint if MyMemory was empty
  if (!translatedText) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&dt=rm&q=${encodeURIComponent(clean)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data[0])) {
          translatedText = data[0].map(item => item[0] || '').filter(Boolean).join('');
        }
      }
    } catch (e) {
      console.debug('Secondary translation fallback error:', e.message);
    }
  }

  const result = {
    sourceText: clean,
    translatedText: translatedText || 'Đang cập nhật bản dịch...',
    romaji,
    hiragana,
    hanViet
  };

  translationCache.set(clean, result);
  return result;
};

export default {
  translateJapanese
};
