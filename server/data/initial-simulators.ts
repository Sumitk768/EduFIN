export const SIMULATOR_PRESETS = {
  compoundInterestPresets: [
    {
      id: 'early-starter',
      name: 'Early Career Long-Term Wealth (Age 22-52)',
      principal: 1000,
      annualRate: 8,
      years: 30,
      monthlyContribution: 250,
      description: 'Disciplined $250/mo investment in broad market index funds over 30 years.',
    },
    {
      id: 'retirement-catchup',
      name: 'Retirement Acceleration (15 Years)',
      principal: 25000,
      annualRate: 7,
      years: 15,
      monthlyContribution: 1000,
      description: 'Aggressive catchup plan with higher monthly capital allocation.',
    },
  ],
  loanPresets: [
    {
      id: 'home-mortgage-30yr',
      name: 'Standard Home Loan (30 Years)',
      loanAmount: 300000,
      annualInterestRate: 6.5,
      tenureYears: 30,
    },
    {
      id: 'auto-loan-5yr',
      name: 'Auto Loan (5 Years)',
      loanAmount: 25000,
      annualInterestRate: 7.2,
      tenureYears: 5,
    },
  ],
  scamPatternSignatures: [
    {
      signature: 'kyc_expiry_urgency',
      keywords: ['kyc', 'expire', 'suspended', 'deactivated', 'immediately', '15 mins', 'click link', 'apk'],
      threatType: 'Banking Phishing / Malware Distribution',
      severity: 'critical_scam',
    },
    {
      signature: 'lottery_winnings_fee',
      keywords: ['won', 'lottery', 'winner', 'claim reward', 'processing fee', 'western union', 'gift card'],
      threatType: 'Advance Fee Fraud',
      severity: 'critical_scam',
    },
    {
      signature: 'guaranteed_crypto_doubler',
      keywords: ['guaranteed 200%', 'double your money', 'crypto bot', 'risk free profit', 'deposit now'],
      threatType: 'Ponzi / High-Yield Investment Scam (HYIP)',
      severity: 'critical_scam',
    },
  ],
};
