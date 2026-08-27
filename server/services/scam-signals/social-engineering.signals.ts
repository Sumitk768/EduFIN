import { DetectedSignal } from './signal-types';

function extractSnippet(text: string, matchIndex: number, length: number): string {
  const start = Math.max(0, matchIndex - 15);
  const end = Math.min(text.length, matchIndex + length + 25);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.substring(start, end).trim()}${suffix}`;
}

export function detectSocialEngineeringSignals(text: string): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  // 1. Secrecy Demands / Isolate from Family or Bank
  const secrecyRegex = /\b(do\s+not\s+(tell|disclose|share\s+with)\s+(your\s+)?(bank|family|friends|anyone)|keep\s+this\s+strictly\s+confidential|do\s+not\s+call\s+the\s+branch|secret\s+operation)\b/i;
  const secrecyMatch = text.match(secrecyRegex);
  if (secrecyMatch && secrecyMatch.index !== undefined) {
    signals.push({
      id: 'soc_secrecy_isolation_tactic',
      category: 'social_engineering',
      name: 'Secrecy & Psychological Isolation Demand',
      severityContribution: 40,
      explanation: 'Demands strict secrecy from bank staff or family members, a classic manipulation tactic to prevent external intervention.',
      evidenceSnippet: extractSnippet(text, secrecyMatch.index, secrecyMatch[0].length),
    });
  }

  // 2. Unsolicited Mega Lottery / Sweepstakes Prize Announcement
  const lotteryRegex = /\b(you\s+(have\s+)?won\s+[\$₹£€]?\s*\d+[,\d]*(\.\d+)?|won\s+[\$₹£€]\d+|lottery\s+winner|lucky\s+draw\s+winner|selected\s+for\s+cash\s+prize|congratulations\s+winner|kbc\s+lottery)\b/i;
  const lotteryMatch = text.match(lotteryRegex);
  if (lotteryMatch && lotteryMatch.index !== undefined) {
    signals.push({
      id: 'soc_unsolicited_lottery_prize_lure',
      category: 'social_engineering',
      name: 'Unsolicited Lottery / Huge Cash Prize Announcement',
      severityContribution: 35,
      explanation: 'Claims you won a lottery or sweepstakes you never entered, designed to trigger excitement and lower critical scrutiny.',
      evidenceSnippet: extractSnippet(text, lotteryMatch.index, lotteryMatch[0].length),
    });
  }

  // 3. Family Emergency / Impersonation of Relative ("Hi Mom/Dad, I lost my phone")
  const familyEmergencyRegex = /\b(hi\s+(mom|dad|mum)|lost\s+my\s+phone|this\s+is\s+my\s+new\s+number|need\s+money\s+urgently\s+for\s+hospital|friend\s+in\s+accident)\b/i;
  const familyEmergencyMatch = text.match(familyEmergencyRegex);
  if (familyEmergencyMatch && familyEmergencyMatch.index !== undefined) {
    signals.push({
      id: 'soc_family_emergency_impersonation',
      category: 'social_engineering',
      name: 'Family Emergency / "Hi Mum" Social Engineering Trick',
      severityContribution: 35,
      explanation: 'Pretends to be a close family member in an emergency using a new phone number to elicit sympathy and quick cash transfers.',
      evidenceSnippet: extractSnippet(text, familyEmergencyMatch.index, familyEmergencyMatch[0].length),
    });
  }

  // 4. Romance / Fake Online Admirer Wealth Promise
  const romanceRegex = /\b(sending\s+you\s+expensive\s+gift|customs\s+clearing\s+for\s+parcel\s+gift|crypto\s+mentor\s+lover|marry\s+me\s+invest\s+together)\b/i;
  const romanceMatch = text.match(romanceRegex);
  if (romanceMatch && romanceMatch.index !== undefined) {
    signals.push({
      id: 'soc_romance_pig_butchering_lure',
      category: 'social_engineering',
      name: 'Romance / Relationship Financial Exploitation (Pig Butchering)',
      severityContribution: 35,
      explanation: 'Uses emotional attachment or fake luxury gifts stuck at customs to demand clearing fees.',
      evidenceSnippet: extractSnippet(text, romanceMatch.index, romanceMatch[0].length),
    });
  }

  return signals;
}
