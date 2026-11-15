/**
 * Removes personal identifiers from CV text BEFORE any LLM call.
 *
 * Deterministic regex + heuristics only: no model is involved in privacy
 * protection, because privacy must never depend on a model behaving well.
 *
 * Strips: names, emails, phone numbers, postal addresses, dates of birth,
 * gender, national ID / passport numbers, URLs and social handles, and
 * institution names (the score never uses them).
 *
 * Keeps: skills, tools, dates of employment in years, degrees and fields,
 * project and responsibility text — everything the scorer actually needs.
 */

export type RedactionType =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'dob'
  | 'gender'
  | 'national_id'
  | 'url'
  | 'institution'
  | 'location';

export interface Redaction {
  type: RedactionType;
  count: number;
}

export interface ScrubResult {
  text: string;
  redactions: Redaction[];
}

const PLACEHOLDER: Record<RedactionType, string> = {
  name: '[NAME]',
  email: '[EMAIL]',
  phone: '[PHONE]',
  address: '[ADDRESS]',
  dob: '[DATE_OF_BIRTH]',
  gender: '[GENDER]',
  national_id: '[ID_NUMBER]',
  url: '[URL]',
  institution: '[INSTITUTION]',
  location: '[LOCATION]',
};

/** Returns false when a candidate match should be left alone (e.g. a year range). */
type Guard = (match: string) => boolean;

/**
 * Bangladeshi university acronyms as they are written on CVs.
 * "BUET" carries as much prestige bias as a spelled-out name, so it goes too.
 */
const BD_INSTITUTION_ACRONYMS = [
  'BUET',
  'KUET',
  'CUET',
  'RUET',
  'SUST',
  'JUST',
  'PSTU',
  'HSTU',
  'MBSTU',
  'NSTU',
  'JKKNIU',
  'BSMRSTU',
  'BSMRAU',
  'SAU',
  'BAU',
  'CVASU',
  'CVMASU',
  'IUT',
  'AUST',
  'BRACU',
  'NSU',
  'AIUB',
  'EWU',
  'DIU',
  'UIU',
  'IUB',
  'IUBAT',
  'SEU',
  'UAP',
  'AUB',
  'LU',
  'DU',
  'JU',
  'CU',
  'RU',
  'KU',
  'IU',
  'SU',
  'VU',
  'SUSTech',
  'NITER',
  'BAIUST',
  'IIUC',
  'IICT',
  'PSTU',
];

/** All 64 districts, with the older English spellings people still write. */
const BD_DISTRICTS = [
  'Dhaka',
  'Dacca',
  'Gazipur',
  'Narayanganj',
  'Narsingdi',
  'Tangail',
  'Kishoreganj',
  'Manikganj',
  'Munshiganj',
  'Faridpur',
  'Rajbari',
  'Madaripur',
  'Shariatpur',
  'Gopalganj',
  'Chattogram',
  'Chittagong',
  "Cox's Bazar",
  'Coxs Bazar',
  'Cumilla',
  'Comilla',
  'Chandpur',
  'Brahmanbaria',
  'Noakhali',
  'Feni',
  'Lakshmipur',
  'Khagrachhari',
  'Khagrachari',
  'Rangamati',
  'Bandarban',
  'Sylhet',
  'Sunamganj',
  'Habiganj',
  'Moulvibazar',
  'Rajshahi',
  'Bogura',
  'Bogra',
  'Chapai Nawabganj',
  'Naogaon',
  'Natore',
  'Joypurhat',
  'Pabna',
  'Sirajganj',
  'Khulna',
  'Bagerhat',
  'Chuadanga',
  'Jashore',
  'Jessore',
  'Jhenaidah',
  'Kushtia',
  'Magura',
  'Meherpur',
  'Narail',
  'Satkhira',
  'Barishal',
  'Barisal',
  'Barguna',
  'Bhola',
  'Jhalokati',
  'Patuakhali',
  'Pirojpur',
  'Rangpur',
  'Dinajpur',
  'Gaibandha',
  'Kurigram',
  'Lalmonirhat',
  'Nilphamari',
  'Panchagarh',
  'Thakurgaon',
  'Mymensingh',
  'Jamalpur',
  'Netrokona',
  'Sherpur',
];

/** District and division names as written on Bangla CVs. */
const BN_PLACES = [
  'ঢাকা',
  'চট্টগ্রাম',
  'চট্টগ্রাম',
  'রাজশাহী',
  'খুলনা',
  'বরিশাল',
  'সিলেট',
  'রংপুর',
  'ময়মনসিংহ',
  'কুমিল্লা',
  'গাজীপুর',
  'নারায়ণগঞ্জ',
  'টাঙ্গাইল',
  'বগুড়া',
  'পাবনা',
  'দিনাজপুর',
  'কক্সবাজার',
  'নোয়াখালী',
  'ফরিদপুর',
  'যশোর',
];

function alternationOf(words: string[]): string {
  // Longest first, so "Chapai Nawabganj" wins over "Chapai" and
  // "Chattogram" over any shorter prefix.
  return [...new Set(words)]
    .sort((a, b) => b.length - a.length)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
}

const DISTRICT_PATTERN = new RegExp(`\\b(?:${alternationOf(BD_DISTRICTS)})\\b`, 'gi');
const BN_PLACE_PATTERN = new RegExp(`${alternationOf(BN_PLACES)}`, 'g');
const ACRONYM_PATTERN = new RegExp(`\\b(?:${alternationOf(BD_INSTITUTION_ACRONYMS)})\\b`, 'g');

/** One run of title-cased words ending in, or containing, an institution word. */
const INSTITUTION_WORD =
  '(?:University|College|Institute|Polytechnic|Academy|Vidyalaya|Madrasa|Madrasah|School)';

/**
 * "of Science and Technology" continues the name, so it has to be consumed
 * together with it — otherwise the replacement leaves the tail behind.
 */
const OF_CLAUSE = `\\s+of\\s+[A-Z][\\w.&'-]*(?:\\s+(?:of|and|for)\\s+[A-Z][\\w.&'-]*)*`;

const INSTITUTION_PHRASE = new RegExp(
  [
    // "Shahjalal University of Science and Technology"
    `(?:[A-Z][\\w.&'-]*\\s+){0,5}${INSTITUTION_WORD}\\b(?:${OF_CLAUSE})?`,
    // "University of Dhaka" at the start of a line or sentence
    `${INSTITUTION_WORD}${OF_CLAUSE}`,
    // Bangla: "ঢাকা বিশ্ববিদ্যালয়"
    `[\\u0980-\\u09FF]+(?:\\s+[\\u0980-\\u09FF]+){0,4}\\s*(?:বিশ্ববিদ্যালয়|কলেজ|ইনস্টিটিউট|স্কুল|মাদ্রাসা|পলিটেকনিক)`,
  ].join('|'),
  'g',
);

/** Collapses "Shahjalal University of Science and Technology" to one placeholder. */
function scrubInstitutions(text: string): string {
  return text.replace(INSTITUTION_PHRASE, PLACEHOLDER.institution);
}

/** A year range like "2022 - 2025" must survive; a real phone number has 9-15 digits. */
function isPhoneNumber(match: string): boolean {
  if (/^(?:19|20)\d{2}\s*[-–—]|\s*(?:to|–|—)\s*(?:19|20)\d{2}$/.test(match.trim())) return false;
  const digits = match.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

const PATTERNS: Array<{
  type: RedactionType;
  pattern: RegExp;
  replacement: string;
  guard?: Guard;
}> = [
  // Explicitly labelled names ("Name: Rahima Akter")
  {
    type: 'name',
    pattern: /(?:^|\n)\s*(?:full\s*name|name|candidate)\s*[:\-]\s*[^\n]{2,60}/gi,
    replacement: `\n${PLACEHOLDER.name}`,
    guard: (match) => !/\d{4}/.test(match),
  },

  // Email addresses
  { type: 'email', pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: PLACEHOLDER.email },

  // URLs and social handles
  { type: 'url', pattern: /https?:\/\/\S+|www\.\S+/g, replacement: PLACEHOLDER.url },
  { type: 'url', pattern: /(?:^|\s)@[A-Za-z0-9._]{3,}\b/g, replacement: ` ${PLACEHOLDER.url}` },

  // Bangladeshi mobile numbers with or without country code and separators
  {
    type: 'phone',
    pattern: /(?:\+?88)?\s?0?\s?1[3-9]\d{2}[\s-]?\d{3}[\s-]?\d{3,4}\b/g,
    replacement: PLACEHOLDER.phone,
    guard: isPhoneNumber,
  },
  // Landline / international numbers
  {
    type: 'phone',
    pattern: /\+?\d[\d\s().-]{8,}\d/g,
    replacement: PLACEHOLDER.phone,
    guard: isPhoneNumber,
  },

  // National ID / passport, labelled or as a 10-17 digit run
  {
    type: 'national_id',
    pattern: /(?:national\s*id|nid|passport(?:\s*no)?|passport\s*number)\s*[:\-#]?\s*[\w\s-]{4,}/gi,
    replacement: PLACEHOLDER.national_id,
  },
  {
    type: 'national_id',
    pattern: /\b\d{4}\s\d{4}\s\d{4}\b/g,
    replacement: PLACEHOLDER.national_id,
  },

  // Date of birth, labelled or as a full date
  {
    type: 'dob',
    pattern:
      /(?:date\s*of\s*birth|d\.?o\.?b\.?|birth\s*date|জন্ম\s*তারিখ|জন্মতারিখ)\s*[:\-]?\s*[^\n,;]{4,40}/gi,
    replacement: PLACEHOLDER.dob,
  },

  // Gender / marital / religion: never relevant to a skill score
  {
    type: 'gender',
    pattern: /\b(?:gender|sex)\s*[:\-]?\s*(?:male|female|other|non-?binary|m|f)\b/gi,
    replacement: `${PLACEHOLDER.gender}`,
  },
  {
    type: 'gender',
    pattern: /\b(?:marital\s*status|religion|nationality)\s*[:\-]?\s*[A-Za-z]{3,20}\b/gi,
    replacement: PLACEHOLDER.gender,
  },

  // Street / postal addresses
  {
    type: 'address',
    pattern:
      /^\s*(?:house|flat|road|block|sector|lane|village|post(?:\s*office)?|thana|upazila|district|p\.?o\.?|ward)\b[^\n]{0,80}$/gim,
    replacement: PLACEHOLDER.address,
  },
  {
    type: 'address',
    pattern:
      /^\s*(?:house|flat|road|block|sector|lane|avenue)\b[^\n]{0,60}(?:dhaka|chattogram|chittagong|sylhet|rajshahi|khulna|gazipur|narayanganj)\s*\d{0,4}\b[^\n]{0,30}$/gim,
    replacement: PLACEHOLDER.address,
  },
  {
    type: 'address',
    pattern:
      /\b(?:house|flat|road|block|sector|lane)\s*(?:no\.?|#)?\s*[\w-]+[^\n]{0,60},\s*(?:dhaka|chattogram|chittagong|sylhet|rajshahi|khulna|gazipur|narayanganj|comilla|mymensingh|barishal|rangpur)\b[^\n]{0,20}/gi,
    replacement: PLACEHOLDER.address,
  },

  // Bare acronyms ("Studied at BUET") carry the same prestige signal as the
  // spelled-out name, so they are removed too. Full institution names are
  // handled by scrubInstitutions() below, which consumes the whole phrase
  // ("Shahjalal University of Science and Technology") in one pass.
  { type: 'institution', pattern: ACRONYM_PATTERN, replacement: PLACEHOLDER.institution },

  // Home district: not needed by the scorer, and a proxy for ethnicity.
  { type: 'location', pattern: DISTRICT_PATTERN, replacement: PLACEHOLDER.location },
  { type: 'location', pattern: BN_PLACE_PATTERN, replacement: PLACEHOLDER.location },
];

const NAME_PREFIXES = /^(?:md\.?|mohammed|muhammad|mohammad|shah|sheikh|syed|sayed)\s+/i;

/** True when a line looks like a person's name at the top of a CV. */
function looksLikeNameLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 60) return false;
  if (/[@\d]/.test(trimmed)) return false;
  if (/[।]/.test(trimmed)) return false;

  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;

  const latin = /^[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z.'-]+)*$/.test(trimmed.replace(/\s+/g, ' '));
  const bengali = /^[\u0980-\u09FF][\u0980-\u09FF.'-]*(?:\s+[\u0980-\u09FF.'-]+)*$/.test(trimmed);

  if (!latin && !bengali) return false;

  // A name is title-cased; a section heading is all caps.
  const isShouting = trimmed === trimmed.toUpperCase();
  return !isShouting;
}

/**
 * Removes identifiers. Counts what it removed so the UI can report it.
 */
export function scrubPii(rawText: string): ScrubResult {
  const counts = new Map<RedactionType, number>();
  let text = rawText.replace(/\r\n/g, '\n');

  // Institutions first: "Rajshahi University of Engineering and Technology"
  // must collapse to one placeholder, not "[LOCATION] University of ...".
  {
    const before = text;
    text = scrubInstitutions(text);
    const removed = (before.match(INSTITUTION_PHRASE) ?? []).length;
    if (removed > 0) {
      counts.set('institution', (counts.get('institution') ?? 0) + removed);
    }
  }

  for (const { type, pattern, replacement, guard } of PATTERNS) {
    text = text.replace(pattern, (match: string) => {
      if (guard && !guard(match)) return match;
      counts.set(type, (counts.get(type) ?? 0) + 1);
      return replacement;
    });
  }

  // The leading name block: first non-empty line before contact details.
  const lines = text.split('\n');
  for (let i = 0; i < Math.min(lines.length, 4); i += 1) {
    const line = lines[i] ?? '';
    if (line.trim().length === 0) continue;
    if (looksLikeNameLine(line)) {
      lines[i] = PLACEHOLDER.name;
      counts.set('name', (counts.get('name') ?? 0) + 1);
      break;
    }
    break; // only inspect the first non-empty line
  }
  text = lines.join('\n');

  // Stray honourifics that survived (e.g. "Md. Rahman" inside prose).
  text = text.replace(NAME_PREFIXES, '');

  // Collapse the blank lines that redaction can leave behind.
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return {
    text,
    redactions: [...counts.entries()].map(([type, count]) => ({ type, count })),
  };
}

/**
 * Post-check used by tests and by the ingest route: any of these still present
 * means the scrubber missed something.
 */
export function findResidualPii(text: string): string[] {
  const problems: string[] = [];
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)) problems.push('email');
  if (/(?:\+?88)?0?1[3-9]\d{2}[\s-]?\d{3}[\s-]?\d{3,4}\b/.test(text)) problems.push('phone');
  if (/\b\d{4}\s\d{4}\s\d{4}\b/.test(text)) problems.push('national_id');
  if (/(?:date\s*of\s*birth|d\.?o\.?b\.?)\s*[:\-]/i.test(text)) problems.push('dob');
  return problems;
}
