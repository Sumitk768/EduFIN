import { DetectedSignal } from './signal-types';

function extractSnippet(text: string, matchIndex: number, length: number): string {
  const start = Math.max(0, matchIndex - 15);
  const end = Math.min(text.length, matchIndex + length + 25);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.substring(start, end).trim()}${suffix}`;
}

export function detectInvestmentFraudSignals(text: string): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  // 1. Guaranteed High Returns / Zero Risk Claims
  const guaranteedRegex = /\b(guaranteed\s+(returns?|profits?|income|yield)|100%\s+risk\s*free|zero\s+risk\s+investment|no\s+risk\s+guarantee|daily\s+profit\s+guaranteed|paisa\s+double)\b/i;
  const guaranteedMatch = text.match(guaranteedRegex);
  if (guaranteedMatch && guaranteedMatch.index !== undefined) {
    signals.push({
      id: 'inv_guaranteed_returns_zero_risk',
      category: 'investment_fraud',
      name: 'Unrealistic "Guaranteed" Returns or Zero-Risk Investment Claim',
      severityContribution: 40,
      explanation: 'Promotes "guaranteed" or "zero-risk" returns. In legitimate financial markets, high return always carries market risk.',
      evidenceSnippet: extractSnippet(text, guaranteedMatch.index, guaranteedMatch[0].length),
    });
  }

  // 2. Double Money / Multifold Multiplication Schemes
  const doubleMoneyRegex = /\b(double\s+(your\s+)?money|2x\s+returns?|triple\s+investment|10x\s+crypto|500%\s+roi|returns?\s+of\s+[\$₹]?\d+\s+in\s+\d+\s*(days?|hours?|weeks?|mins?)|grow\s+money\s+fast)\b/i;
  const doubleMoneyMatch = text.match(doubleMoneyRegex);
  if (doubleMoneyMatch && doubleMoneyMatch.index !== undefined) {
    signals.push({
      id: 'inv_double_money_ponzi',
      category: 'investment_fraud',
      name: 'Rapid Wealth Multiplication / Ponzi Proposition',
      severityContribution: 45,
      explanation: 'Promises to multiply funds in short timeframes (e.g. double money in 24 hours), characteristic of Ponzi and pyramid schemes.',
      evidenceSnippet: extractSnippet(text, doubleMoneyMatch.index, doubleMoneyMatch[0].length),
    });
  }

  // 3. Insider Crypto Signals / Automated Arbitrage Bots
  const cryptoScamRegex = /\b(vip\s+(crypto|trading|arbitrage)|automated\s+arbitrage|forex\s+trading\s+robot|exclusive\s+trading\s+group|pump\s+and\s+dump\s+group|deposit\s+usdt\s+to\s+mine|crypto\s+signals?)\b/i;
  const cryptoScamMatch = text.match(cryptoScamRegex);
  if (cryptoScamMatch && cryptoScamMatch.index !== undefined) {
    signals.push({
      id: 'inv_crypto_arbitrage_forex_trap',
      category: 'investment_fraud',
      name: 'Unregulated VIP Crypto / Forex Arbitrage Scheme',
      severityContribution: 35,
      explanation: 'Lures users into private Telegram or WhatsApp groups promising insider trading signals or fake crypto mining returns.',
      evidenceSnippet: extractSnippet(text, cryptoScamMatch.index, cryptoScamMatch[0].length),
    });
  }

  // 4. Instant No-Verification Pre-Approved Loan Scam
  const loanScamRegex = /\b(instant\s+loan\s+approved|no\s+cibil\s+check\s+loan|pre-?approved\s+loan\s+of\s+[\$₹]?\d+|loan\s+without\s+documents|pay\s+insurance\s+to\s+disburse\s+loan)\b/i;
  const loanScamMatch = text.match(loanScamRegex);
  if (loanScamMatch && loanScamMatch.index !== undefined) {
    signals.push({
      id: 'inv_fake_instant_loan_preapproval',
      category: 'investment_fraud',
      name: 'Instant No-Verification Pre-Approved Loan Bait',
      severityContribution: 35,
      explanation: 'Claims a large loan is pre-approved without credit checks, used to extract advance processing/insurance fees.',
      evidenceSnippet: extractSnippet(text, loanScamMatch.index, loanScamMatch[0].length),
    });
  }

  return signals;
}
