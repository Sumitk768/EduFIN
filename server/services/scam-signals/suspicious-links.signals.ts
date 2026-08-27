import { DetectedSignal } from './signal-types';

function extractSnippet(text: string, matchIndex: number, length: number): string {
  const start = Math.max(0, matchIndex - 15);
  const end = Math.min(text.length, matchIndex + length + 25);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.substring(start, end).trim()}${suffix}`;
}

export function detectSuspiciousLinkSignals(text: string): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  // 1. URL Shorteners in unsolicited financial/urgency contexts
  const shortenerRegex = /\bhttps?:\/\/(bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly|rb\.gy|goo\.gl|ow\.ly|buff\.ly|shorturl\.at|v\.gd)\/[a-zA-Z0-9_-]+/i;
  const shortenerMatch = text.match(shortenerRegex);
  if (shortenerMatch && shortenerMatch.index !== undefined) {
    signals.push({
      id: 'link_url_shortener_obfuscation',
      category: 'suspicious_links',
      name: 'Obfuscated URL Shortener Link',
      severityContribution: 30,
      explanation: 'Uses a URL shortening service to hide the true destination website, a standard tactic to conceal phishing or malware landing pages.',
      evidenceSnippet: extractSnippet(text, shortenerMatch.index, shortenerMatch[0].length),
    });
  }

  // 2. High-Risk TLDs (.xyz, .top, .cc, .ru, .work, .click, .buzz, .club, .tk, .ga, .cf, .gq)
  const suspiciousTldRegex = /\bhttps?:\/\/[a-zA-Z0-9.-]+\.(xyz|top|cc|ru|work|click|buzz|club|tk|ga|cf|gq|info|online|site|live|icu|vip|rest|monster)(\/[^\s]*)?/i;
  const suspiciousTldMatch = text.match(suspiciousTldRegex);
  if (suspiciousTldMatch && suspiciousTldMatch.index !== undefined) {
    signals.push({
      id: 'link_suspicious_tld_domain',
      category: 'suspicious_links',
      name: 'Suspicious / Cheap High-Risk Domain TLD',
      severityContribution: 35,
      explanation: 'Points to a high-risk generic top-level domain frequently associated with disposable phishing campaigns rather than official corporate portals.',
      evidenceSnippet: extractSnippet(text, suspiciousTldMatch.index, suspiciousTldMatch[0].length),
    });
  }

  // 3. IP-based URLs (e.g. http://192.168... or http://45.33.2.1/...)
  const ipUrlRegex = /\bhttps?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/[^\s]*)?/i;
  const ipUrlMatch = text.match(ipUrlRegex);
  if (ipUrlMatch && ipUrlMatch.index !== undefined) {
    signals.push({
      id: 'link_raw_ip_address_host',
      category: 'suspicious_links',
      name: 'Direct Numeric IP Address URL',
      severityContribution: 45,
      explanation: 'Directs the user to a raw numerical IP address instead of a recognized branded domain name, almost exclusively seen in malicious servers.',
      evidenceSnippet: extractSnippet(text, ipUrlMatch.index, ipUrlMatch[0].length),
    });
  }

  // 4. Typosquatting / Fake Subdomain Lookalikes (e.g. sbi-kyc-verify, hdfc-netbanking-alert, amazon-security)
  const lookalikeRegex = /\bhttps?:\/\/[a-zA-Z0-9.-]*(sbi|hdfc|icici|axis|chase|paypal|amazon|netflix|apple|google|rbi)-[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?/i;
  const lookalikeMatch = text.match(lookalikeRegex);
  if (lookalikeMatch && lookalikeMatch.index !== undefined) {
    signals.push({
      id: 'link_typosquatting_phishing_domain',
      category: 'suspicious_links',
      name: 'Impersonated Brand Typosquatting Domain',
      severityContribution: 45,
      explanation: 'Features a hyphenated or deceptive subdomain string attempting to mimic a trusted brand (e.g. brand-verify.xyz).',
      evidenceSnippet: extractSnippet(text, lookalikeMatch.index, lookalikeMatch[0].length),
    });
  }

  // 5. Insecure HTTP Link for Sensitive Operations
  const insecureHttpRegex = /\bhttp:\/\/[a-zA-Z0-9.-]+\/[^\s]*(login|verify|account|banking|kyc|pay)/i;
  const insecureHttpMatch = text.match(insecureHttpRegex);
  if (insecureHttpMatch && insecureHttpMatch.index !== undefined) {
    signals.push({
      id: 'link_insecure_http_sensitive_action',
      category: 'suspicious_links',
      name: 'Unencrypted (HTTP) Sensitive Action URL',
      severityContribution: 30,
      explanation: 'Uses unencrypted HTTP protocol for an alleged login or verification procedure; legitimate banking portals require HTTPS encryption.',
      evidenceSnippet: extractSnippet(text, insecureHttpMatch.index, insecureHttpMatch[0].length),
    });
  }

  return signals;
}
