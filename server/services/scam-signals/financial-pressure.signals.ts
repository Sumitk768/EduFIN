import { DetectedSignal } from './signal-types';

function extractSnippet(text: string, matchIndex: number, length: number): string {
  const start = Math.max(0, matchIndex - 15);
  const end = Math.min(text.length, matchIndex + length + 25);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.substring(start, end).trim()}${suffix}`;
}

export function detectFinancialPressureSignals(text: string): DetectedSignal[] {
  const signals: DetectedSignal[] = [];
  const lower = text.toLowerCase();

  // 1. Immediate Transfer / Pay Now Demand
  const urgentPayRegex = /\b(pay\s+now|send\s+(money|cash|funds)|transfer\s+(immediately|now|today|funds)|paise\s+bhejo|turant\s+payment)\b/i;
  const urgentPayMatch = text.match(urgentPayRegex);
  if (urgentPayMatch && urgentPayMatch.index !== undefined) {
    signals.push({
      id: 'fin_urgent_payment',
      category: 'financial_pressure',
      name: 'Demanding Immediate Money Transfer',
      severityContribution: 30,
      explanation: 'Demands an immediate direct transfer of funds without allowing standard verification time.',
      evidenceSnippet: extractSnippet(text, urgentPayMatch.index, urgentPayMatch[0].length),
    });
  }

  // 2. Advance Fee / Registration Fee / Processing Charges
  const advanceFeeRegex = /\b(advance\s+fee|processing\s+fee|registration\s+fee|clearance\s+charge|refundable\s+deposit|pay\s+\$?\d+\s+to\s+claim|pay\s+rs\.?\s*\d+\s+to\s+receive|charges\s+required)\b/i;
  const advanceFeeMatch = text.match(advanceFeeRegex);
  if (advanceFeeMatch && advanceFeeMatch.index !== undefined) {
    signals.push({
      id: 'fin_advance_fee',
      category: 'financial_pressure',
      name: 'Advance Fee or Processing Charge Required',
      severityContribution: 35,
      explanation: 'Asks for an upfront payment or processing fee before releasing an alleged prize, loan, or reward (classic 419/advance-fee fraud).',
      evidenceSnippet: extractSnippet(text, advanceFeeMatch.index, advanceFeeMatch[0].length),
    });
  }

  // 3. Unusual / Non-standard Payment Channels (Gift Cards, Crypto, Western Union)
  const unusualPayRegex = /\b(gift\s*card|apple\s*card|steam\s*card|google\s*play\s*card|bitcoin\s*wallet|crypto\s*address|usdt|western\s*union|moneygram)\b/i;
  const unusualPayMatch = text.match(unusualPayRegex);
  if (unusualPayMatch && unusualPayMatch.index !== undefined) {
    signals.push({
      id: 'fin_unusual_payment_method',
      category: 'financial_pressure',
      name: 'Untraceable Payment Method Requested (Gift Cards / Crypto)',
      severityContribution: 40,
      explanation: 'Demands payment via gift cards or cryptocurrency, which are irreversible, anonymous, and untraceable by law enforcement.',
      evidenceSnippet: extractSnippet(text, unusualPayMatch.index, unusualPayMatch[0].length),
    });
  }

  // 4. Overpayment / Accidental Refund Scam
  const overpayRegex = /\b(refunded\s+by\s+mistake|sent\s+extra\s+money|overpaid\s+you|send\s+back\s+the\s+difference|refund\s+excess)\b/i;
  const overpayMatch = text.match(overpayRegex);
  if (overpayMatch && overpayMatch.index !== undefined) {
    signals.push({
      id: 'fin_overpayment_scam',
      category: 'financial_pressure',
      name: 'Fake Refund / Overpayment Reversal Trick',
      severityContribution: 35,
      explanation: 'Claims extra money was deposited by mistake and pressures the recipient to return funds before the original fake transaction bounces.',
      evidenceSnippet: extractSnippet(text, overpayMatch.index, overpayMatch[0].length),
    });
  }

  // 5. UPI PIN to Receive Money Deception
  const upiPinReceiveRegex = /\b(enter\s+(upi\s*)?pin\s+to\s+receive|scan\s+qr\s+to\s+get\s+money|approve\s+collect\s+request\s+to\s+credit)\b/i;
  const upiPinMatch = text.match(upiPinReceiveRegex);
  if (upiPinMatch && upiPinMatch.index !== undefined) {
    signals.push({
      id: 'fin_upi_pin_receive_deception',
      category: 'financial_pressure',
      name: 'Deceptive Request to Enter PIN/QR to Receive Money',
      severityContribution: 45,
      explanation: 'Tells user to enter UPI PIN or approve a request to receive funds. In real banking, entering a PIN ALWAYS deducts money.',
      evidenceSnippet: extractSnippet(text, upiPinMatch.index, upiPinMatch[0].length),
    });
  }

  return signals;
}
