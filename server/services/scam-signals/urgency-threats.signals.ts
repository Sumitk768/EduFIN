import { DetectedSignal } from './signal-types';

function extractSnippet(text: string, matchIndex: number, length: number): string {
  const start = Math.max(0, matchIndex - 15);
  const end = Math.min(text.length, matchIndex + length + 25);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.substring(start, end).trim()}${suffix}`;
}

export function detectUrgencyThreatSignals(text: string): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  // 1. Account Suspension / Deactivation / Block / Lock Threat
  const suspensionRegex = /\b(account\s+(is|will\s+be|has\s+been)\s+(blocked|suspended|deactivated|closed|terminated|frozen|locked)|card\s+(is|will\s+be)\s+(blocked|locked)|sim\s+will\s+be\s+deactivated|block\s+ho\s+jayega|band\s+kar\s+diya\s+jayega)\b/i;
  const suspensionMatch = text.match(suspensionRegex);
  if (suspensionMatch && suspensionMatch.index !== undefined) {
    signals.push({
      id: 'urg_account_suspension_threat',
      category: 'urgency_threats',
      name: 'Account / SIM Suspension Threat',
      severityContribution: 35,
      explanation: 'Uses fear of account freezing or service disruption to coerce hasty compliance without verification.',
      evidenceSnippet: extractSnippet(text, suspensionMatch.index, suspensionMatch[0].length),
    });
  }

  // 2. Legal Action / Arrest Warrant / Police Threat
  const legalThreatRegex = /\b(arrest\s+warrant|police\s+action|court\s+notice|legal\s+action|cbi|fbi|irs|income\s*tax\s*department|customs\s*officer|prosecution|fir\s+registered)\b/i;
  const legalThreatMatch = text.match(legalThreatRegex);
  if (legalThreatMatch && legalThreatMatch.index !== undefined) {
    signals.push({
      id: 'urg_legal_prosecution_threat',
      category: 'urgency_threats',
      name: 'Legal Prosecution or Arrest Threat',
      severityContribution: 40,
      explanation: 'Intimidates the recipient with fake law enforcement or court arrest threats (digital arrest scams).',
      evidenceSnippet: extractSnippet(text, legalThreatMatch.index, legalThreatMatch[0].length),
    });
  }

  // 3. Imminent Countdown / Tight Timeframe Pressure (15 mins, 24 hours, today, immediately)
  const countdownRegex = /\b(immediately|urgent:|urgently|within\s+(10|15|30)\s*(mins?|minutes?)|within\s+24\s*hours?|today\s+only|before\s+midnight|action\s+required\s+urgently|turant|aaj\s+hi)\b/i;
  const countdownMatch = text.match(countdownRegex);
  if (countdownMatch && countdownMatch.index !== undefined) {
    signals.push({
      id: 'urg_tight_countdown_pressure',
      category: 'urgency_threats',
      name: 'Artificial Tight Countdown Pressure',
      severityContribution: 25,
      explanation: 'Imposes an artificial urgency window to prevent the victim from consulting family or verifying with the institution.',
      evidenceSnippet: extractSnippet(text, countdownMatch.index, countdownMatch[0].length),
    });
  }

  // 4. Utility Disconnection Threat (Electricity, Water, Gas)
  const utilityRegex = /\b(electricity\s+will\s+be\s+disconnected|power\s+cut\s+at\s+\d+\s*(pm|am)?|bijli\s+kat\s+di\s+jayegi|gas\s+connection\s+cancelled)\b/i;
  const utilityMatch = text.match(utilityRegex);
  if (utilityMatch && utilityMatch.index !== undefined) {
    signals.push({
      id: 'urg_utility_disconnection_threat',
      category: 'urgency_threats',
      name: 'Essential Utility Disconnection Threat',
      severityContribution: 35,
      explanation: 'Falsely threatens immediate cutoff of essential services (electricity/gas) to panic homeowners into paying via personal phone numbers.',
      evidenceSnippet: extractSnippet(text, utilityMatch.index, utilityMatch[0].length),
    });
  }

  return signals;
}
