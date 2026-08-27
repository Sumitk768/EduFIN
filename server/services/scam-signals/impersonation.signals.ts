import { DetectedSignal } from './signal-types';

function extractSnippet(text: string, matchIndex: number, length: number): string {
  const start = Math.max(0, matchIndex - 15);
  const end = Math.min(text.length, matchIndex + length + 25);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.substring(start, end).trim()}${suffix}`;
}

export function detectImpersonationSignals(text: string): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  // 1. Bank / Central Bank Impersonation
  const bankRegex = /\b(dear\s+(sbi|hdfc|icici|axis|pnb|bob|kotak|chase|wells\s*fargo|bank\s+of\s+america|citi|rbi|reserve\s*bank|federal\s*reserve)\s*(user|customer|account\s*holder)?|(sbi|hdfc|icici|axis|pnb|bob|kotak|chase|wells\s*fargo|bank\s+of\s+america|citi|rbi)\s+(security\s+team|fraud\s+dept|alert|helpline|support\s+desk|customer\s+care)|official\s+bank\s+alert|central\s+bank\s+notice)\b/i;
  const bankMatch = text.match(bankRegex);
  if (bankMatch && bankMatch.index !== undefined) {
    signals.push({
      id: 'imp_bank_financial_institution',
      category: 'impersonation',
      name: 'Financial Institution / Central Bank Impersonation',
      severityContribution: 30,
      explanation: 'Mimics reputable retail banks or central monetary authorities to establish fraudulent credibility.',
      evidenceSnippet: extractSnippet(text, bankMatch.index, bankMatch[0].length),
    });
  }

  // 2. Courier / Delivery Service Impersonation (FedEx, DHL, UPS, India Post, USPS)
  const deliveryRegex = /\b(fedex|dhl|ups|usps|india\s*post|royal\s*mail|courier\s+parcel|package\s+delivery\s+failed|address\s+confirmation\s+needed|delivery\s+fee\s+unpaid)\b/i;
  const deliveryMatch = text.match(deliveryRegex);
  if (deliveryMatch && deliveryMatch.index !== undefined) {
    signals.push({
      id: 'imp_courier_delivery_service',
      category: 'impersonation',
      name: 'Postal / Courier Delivery Service Impersonation',
      severityContribution: 25,
      explanation: 'Pretends a package is stuck or pending delivery to trick victims into paying redelivery fees or entering personal addresses/card numbers.',
      evidenceSnippet: extractSnippet(text, deliveryMatch.index, deliveryMatch[0].length),
    });
  }

  // 3. E-commerce / Tech Giant Impersonation (Amazon, Apple, Microsoft, Netflix)
  const techBrandRegex = /\b(amazon\s+(security|order|customer\s*service)|apple\s+support|microsoft\s+technical\s+support|netflix\s+subscription\s+(expired|payment\s+failed)|paypal\s+security\s+team)\b/i;
  const techBrandMatch = text.match(techBrandRegex);
  if (techBrandMatch && techBrandMatch.index !== undefined) {
    signals.push({
      id: 'imp_tech_ecommerce_brand',
      category: 'impersonation',
      name: 'E-commerce / Tech Giant Brand Impersonation',
      severityContribution: 25,
      explanation: 'Spoofs global brand names (Amazon, Apple, Netflix) to deceive customers into reviewing fake purchases or renewal billing.',
      evidenceSnippet: extractSnippet(text, techBrandMatch.index, techBrandMatch[0].length),
    });
  }

  // 4. Job Recruiter / Part-time Task Fraud Impersonation
  const jobRecruiterRegex = /\b(part\s*time\s*job|earn\s+\$?\d{2,5}\s+daily|earn\s+rs\.?\s*\d{3,5}\s+per\s+day|work\s+from\s+home\s+task|like\s+youtube\s+videos\s+to\s+earn|telegram\s+job\s+task|hr\s+manager\s+recruiting)\b/i;
  const jobRecruiterMatch = text.match(jobRecruiterRegex);
  if (jobRecruiterMatch && jobRecruiterMatch.index !== undefined) {
    signals.push({
      id: 'imp_job_task_recruitment',
      category: 'impersonation',
      name: 'Unsolicited High-Paying Task / Part-Time Job Solicitations',
      severityContribution: 35,
      explanation: 'Offers unrealistically easy daily earnings for liking videos or doing tasks on Telegram (prepaid task fraud).',
      evidenceSnippet: extractSnippet(text, jobRecruiterMatch.index, jobRecruiterMatch[0].length),
    });
  }

  return signals;
}
