import type { LLMProvider, ChatRequest, ChatResponse, ChatChunk, ModelInfo, ChatMessage, ToolCall } from '@sorani/provider-llm';

/**
 * SimulationAgentLLM — a self-contained conversational "brain" used by the
 * offline simulation so Rojin responds meaningfully in Sorani or English
 * (matching the customer's language) without needing an external model or API.
 *
 * It drives the real tool pipeline (search → availability → create) by looking
 * at the tool results already produced, and generates natural-language replies
 * from those live results.
 */

const SORANI_RE = /[\u0600-\u06FF]/;

const RESTAURANTS: { id: string; name: string; city: string; cuisine: string }[] = [
  { id: 'rest-hewar', name: 'Hewar Restaurant', city: 'Erbil', cuisine: 'kurdish' },
  { id: 'rest-machu', name: 'Machu Restaurant', city: 'Erbil', cuisine: 'fusion' },
  { id: 'rest-italian-house', name: 'Italian House', city: 'Erbil', cuisine: 'italian' },
  { id: 'rest-abc-steakhouse', name: 'ABC Steakhouse', city: 'Sulaymaniyah', cuisine: 'steakhouse' },
  { id: 'rest-erbil-garden', name: 'Erbil Garden', city: 'Erbil', cuisine: 'kurdish' },
  { id: 'rest-family', name: 'Family Restaurant', city: 'Erbil', cuisine: 'kurdish' },
  { id: 'rest-sushi', name: 'Sushi Restaurant', city: 'Erbil', cuisine: 'sushi' },
];

interface BookingIntent {
  city?: string;
  cuisine?: string;
  restaurantId?: string;
  restaurantName?: string;
  date?: string;
  time?: string;
  guests?: number;
}

function isSorani(text: string): boolean {
  return SORANI_RE.test(text);
}

// Kurdish / English number words → digit (for party size detection).
const NUMBER_WORDS: [string, number][] = [
  ['یەک', 1], ['دوو', 2], ['سێ', 3], ['چوار', 4], ['پێنج', 5],
  ['شەش', 6], ['حەوت', 7], ['هەشت', 8], ['نۆ', 9], ['دە', 10],
  ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5],
  ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10],
];

function toArabicIndicInt(s: string): number {
  const map: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
  return parseInt(s.split('').map((c) => map[c] ?? c).join(''), 10);
}

function guessGuests(text: string): number | undefined {
  const arabic = text.match(/[٠-٩]{1,2}/);
  if (arabic) return toArabicIndicInt(arabic[0]);
  const ascii = text.match(/\b(\d{1,2})\b/);
  if (ascii) return parseInt(ascii[1], 10);
  const t = text.toLowerCase();
  for (const [w, n] of NUMBER_WORDS) if (t.includes(w)) return n;
  return undefined;
}

function containsAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w.toLowerCase()));
}

function pickRestaurant(text: string): BookingIntent {
  const t = text.toLowerCase();
  for (const r of RESTAURANTS) {
    if (t.includes(r.name.toLowerCase()) || (r.name.split(' ')[0] && t.includes(r.name.split(' ')[0].toLowerCase()))) {
      return { restaurantId: r.id, restaurantName: r.name, city: r.city, cuisine: r.cuisine };
    }
  }
  return {};
}

/** Extract a booking intent from all the customer's utterances so far. */
function extractIntent(allUserText: string): BookingIntent {
  const t = allUserText.toLowerCase();
  const intent: BookingIntent = pickRestaurant(allUserText);

  if (containsAny(t, ['sulaymaniyah', 'سڵێمانی', 'سلێمانی'])) intent.city = 'Sulaymaniyah';
  else if (containsAny(t, ['erbil', 'ئێربیل'])) intent.city = 'Erbil';

  if (containsAny(t, ['italian', 'ئیتاڵی'])) intent.cuisine = 'Italian';
  else if (containsAny(t, ['sushi', 'سوشی'])) intent.cuisine = 'Sushi';
  else if (containsAny(t, ['steak', 'ستیک', 'steakhouse'])) intent.cuisine = 'Steakhouse';
  else if (containsAny(t, ['kurdish', 'کوردی'])) intent.cuisine = 'Kurdish';
  else if (containsAny(t, ['turkish', 'تورکی'])) intent.cuisine = 'Turkish';

  const guests = guessGuests(allUserText);
  if (guests) intent.guests = guests;

  return intent;
}

function isAffirmative(text: string, lang: 'ckb' | 'en'): boolean {
  const t = text.toLowerCase();
  if (lang === 'ckb') return /\b(بەڵێ|ئەرێ|بەلێ)\b|بەڵێ/.test(t) || containsAny(t, ['بەڵێ', 'تۆمار بکە', 'حجز بکە']);
  return containsAny(t, ['yes', 'yep', 'sure', 'ok', 'book it', 'reserve', 'confirm']);
}

function resultsOf(messages: ChatMessage[], name: string): unknown[] {
  return messages.filter((m) => m.name === name).map((m) => m.content);
}

/** Best-effort resolve the restaurant id from intent or live tool results. */
function resolveRestaurantId(intent: BookingIntent, searchResult: any, availResult: any): string | undefined {
  if (intent.restaurantId) return intent.restaurantId;
  if (availResult?.restaurantId) return availResult.restaurantId;
  if (Array.isArray(searchResult) && searchResult[0]?.id) return searchResult[0].id;
  return undefined;
}

function defaultDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function lastResultOf(messages: ChatMessage[], name: string): any {
  const list = resultsOf(messages, name);
  if (!list.length) return undefined;
  try {
    const parsed = JSON.parse(String(list[list.length - 1]));
    return parsed.result;
  } catch {
    return undefined;
  }
}

function toolCall(id: string, name: string, args: Record<string, unknown>, model: string): ChatResponse {
  return {
    id,
    model,
    choices: [{ message: { role: 'assistant', content: '' }, finishReason: 'tool_calls', toolCalls: [{ id, name, arguments: args }] }],
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
}

function textReply(content: string, model: string): ChatResponse {
  return {
    id: 'r',
    model,
    choices: [{ message: { role: 'assistant', content }, finishReason: 'stop' }],
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
}

export class SimulationAgentLLM implements LLMProvider {
  readonly name = 'mock';

  private templates(lang: 'ckb' | 'en') {
    const ckb = {
      greeting: 'سڵاو، من ڕۆژینم. چۆن دەتوانم یارمەتیت بەم؟ دەتوانم بۆت ڕێستۆرانت بگەڕێم و حجزت بکەم — بۆ چەند کەس، چ ڕۆژێک و لە کام شارەوە دەتەوێت؟',
      foundSingle: (name: string) => `${name} دۆزرایەوە و بەردەستە. دەتەوێت لەوێ حجز بکەم؟`,
      foundMany: (items: string[]) => `${items.length} ڕێستۆرانتەکم دۆزییەوە: ${items.join('، ')}. کامەیان هەڵدەبژێریت؟`,
      noResults: 'بە داخەوە هیچ ڕێستۆرانتێکی گونجاوم نەدۆزییەوە. تکایە شاری یان جۆری خواردن بگۆڕە.',
      available: (name: string, time: string, guests: number, date: string) => `لە کاتژمێر ${time} و لە ڕۆژی ${date} لە ${name} مێزی بەردەست هەیە بۆ ${guests} کەس. دەتەوێت حجزەکە تۆمار بکەم؟`,
      notAvailable: 'بە داخەوە لەم کاتەدا هیچ مێزێکی بەردەست نییە. کاتێکی دیکە یان ڕێستۆرانتێکی دیکە هەیە دەتەوێت؟',
      confirmAsk: (summary: string) => `تکایە پشتڕاستی بکەرەوە: ${summary}. ئایا حجزەکە تۆمار بکەم؟`,
      confirmed: (name: string) => `حجزەکەت بە سەرکەوتوویی تۆمار کرا بۆ ${name}. چاوەڕوانتین!`,
      error: 'بە داخەوە کێشەیەک ڕوویدا. تکایە دوای کەمێک هەوڵبدەرەوە.',
    };
    const en = {
      greeting: 'Hello, I am Rojin. How can I help? I can find a restaurant and book a table for you — for how many guests, which day, and in which city?',
      foundSingle: (name: string) => `${name} was found and is available. Would you like me to book it?`,
      foundMany: (items: string[]) => `I found ${items.length} suitable restaurants: ${items.join(', ')}. Which one would you like?`,
      noResults: 'Sorry, I could not find a matching restaurant. Please change the city or cuisine.',
      available: (name: string, time: string, guests: number, date: string) => `There is a table available at ${time} on ${date} at ${name} for ${guests} guests. Would you like me to book it?`,
      notAvailable: 'Unfortunately there is no table available at that time. Would you like another time or restaurant?',
      confirmAsk: (summary: string) => `Please confirm: ${summary}. Shall I create the reservation?`,
      confirmed: (name: string) => `Your reservation was created successfully at ${name}. We look forward to seeing you!`,
      error: 'Sorry, something went wrong. Please try again in a moment.',
    };
    return lang === 'ckb' ? ckb : en;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model || 'mock';
    const userMessages = request.messages.filter((m) => m.role === 'user').map((m) => m.content);
    const lastUser = userMessages[userMessages.length - 1] || '';
    // If a language is forced (e.g. the public page is Sorani-only), use it.
    const lang: 'ckb' | 'en' =
      request.preferredLanguage === 'ckb'
        ? 'ckb'
        : request.preferredLanguage === 'en'
          ? 'en'
          : isSorani(lastUser)
            ? 'ckb'
            : 'en';
    const T = this.templates(lang);
    const allUserText = userMessages.join(' ');
    const intent = extractIntent(allUserText);

    const searchResult = lastResultOf(request.messages, 'search_restaurants');
    const availResult = lastResultOf(request.messages, 'search_availability');
    const createAttempted = resultsOf(request.messages, 'create_reservation').length > 0;
    const createResult = lastResultOf(request.messages, 'create_reservation');

    // 1. A create was attempted → final reply (success or error, no looping).
    if (createAttempted) {
      const ok = !!createResult && createResult.status === 'CONFIRMED';
      const restId = resolveRestaurantId(intent, searchResult, availResult);
      const restaurant = restId
        ? RESTAURANTS.find((r) => r.id === restId)?.name || 'restaurant'
        : intent.restaurantName;
      return textReply(this.finalizeConfirm(ok, restaurant, lang), model);
    }

    // 2. Availability checked → confirm or create.
    if (availResult) {
      const restId = resolveRestaurantId(intent, searchResult, availResult);
      const restaurant = restId
        ? RESTAURANTS.find((r) => r.id === restId)?.name || 'restaurant'
        : intent.restaurantName || 'restaurant';
      const time = intent.time || '19:30';
      const date = intent.date || defaultDate();
      const guests = intent.guests || 2;
      if (isAffirmative(lastUser, lang)) {
        return toolCall('c1', 'create_reservation', {
          restaurantId: restId,
          date,
          time,
          guests,
          customerName: 'Guest',
          customerPhone: '',
        }, model);
      }
      const available = availResult && availResult.available !== false;
      if (!available) return textReply(T.notAvailable, model);
      return textReply(T.available(restaurant, time, guests, date), model);
    }

    // 3. Searching done → choose restaurant.
    if (searchResult) {
      const results = Array.isArray(searchResult) ? searchResult : [];
      if (intent.restaurantId) {
        return toolCall('c2', 'search_availability', {
          restaurantId: intent.restaurantId,
          date: intent.date,
          time: intent.time,
          guests: intent.guests,
        }, model);
      }
      if (results.length === 1) {
        return toolCall('c3', 'search_availability', { restaurantId: results[0].id, date: intent.date, time: intent.time, guests: intent.guests }, model);
      }
      if (results.length > 1) {
        return textReply(T.foundMany(results.map((r) => r.name)), model);
      }
      return textReply(T.noResults, model);
    }

    // 4. No search yet → search or ask for more info.
    const canSearch = intent.restaurantName || intent.cuisine;
    if (canSearch) {
      return toolCall('c4', 'search_restaurants', {
        city: intent.city,
        cuisine: intent.cuisine,
        restaurantName: intent.restaurantName,
        guests: intent.guests,
        date: intent.date,
        time: intent.time,
      }, model);
    }

    const trimmed = lastUser.trim();
    if (!trimmed || trimmed.length < 2) {
      return textReply(T.greeting, model);
    }

    // Greeting / small talk → friendly greeting back (not an echo).
    if (containsAny(trimmed, ['سڵاو', 'سلام', 'بەخێربێیت', 'hello', 'hi', 'slaw', 'choni', 'چۆنی'])) {
      return textReply(lang === 'ckb' ? T.greeting : 'Hello! How can I help you today?', model);
    }

    // Unknown input: don't silently repeat the generic greeting. Echo what was
    // heard and ask for clarification, so the caller sees we captured the speech.
    if (lang === 'ckb') {
      return textReply(`گەڕاوم بۆ: «${trimmed}». بە داخەوە تێگەیشتم نەبوو — دەتوانیت بە کورتی بڵێیت دەتەوێت چی؟ بۆ نموونە: ڕێستۆرانتێکی ئیتاڵی لە ئەربیل بۆ چوار کەس.`, model);
    }
    return textReply(`I heard: "${trimmed}". I didn't quite understand — could you say briefly what you'd like? For example: an Italian restaurant in Erbil for four people.`, model);
  }

  private finalizeConfirm(ok: boolean, restaurant: string | undefined, lang: 'ckb' | 'en'): string {
    const T = this.templates(lang);
    return ok ? T.confirmed(restaurant || 'restaurant') : T.error;
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const result = await this.chat(request);
    const content = result.choices[0].message.content;
    yield { id: 's', model: result.model, delta: content, finishReason: 'stop' };
  }

  async getModelInfo(): Promise<ModelInfo> {
    return { name: 'mock', provider: 'simulation', supportsTools: true, supportsStreaming: true };
  }
}

export function isSimulationSorani(text: string): boolean {
  return isSorani(text);
}

export { RESTAURANTS as SIMULATION_RESTAURANTS };
