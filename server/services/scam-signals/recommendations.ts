import { DetectedSignal, RiskSeverity, ScamType } from './signal-types';

export interface ActionRecommendations {
  recommendedActions: string[];
  preventionTips: string[];
  helplineOrReportingAdvice: string;
  disclaimer: string;
}

export function generateDefensiveGuidance(
  scamType: ScamType,
  severity: RiskSeverity,
  signals: DetectedSignal[],
  language: string = 'en'
): ActionRecommendations {
  const signalIds = new Set(signals.map((s) => s.id));
  const actions: string[] = [];
  const tips: string[] = [];

  // Safe baseline if benign
  if (severity === 'benign') {
    return {
      recommendedActions: [
        'No immediate threat detected. Standard vigilance is recommended.',
        'Always double-check sender email addresses or phone numbers before sharing personal data.',
      ],
      preventionTips: [
        'Keep banking apps updated through official app stores (Google Play / Apple App Store).',
        'Enable two-factor authentication (2FA) with an authenticator app rather than SMS when possible.',
      ],
      helplineOrReportingAdvice: 'If you suspect future unsolicited communications, contact your bank via the number on the back of your debit/credit card.',
      disclaimer: 'This automated risk assessment is an educational tool and does not replace official banking verification or formal law enforcement investigation.',
    };
  }

  // 1. Specific defensive actions based on matched signals
  if (signalIds.has('cred_otp_solicitation')) {
    actions.push('NEVER share your OTP or 2FA code with anyone, even if they claim to be a bank official or fraud officer.');
  }

  if (signalIds.has('cred_pin_cvv_password_solicitation') || signalIds.has('fin_upi_pin_receive_deception')) {
    actions.push('NEVER enter your UPI PIN, ATM PIN, or card CVV. Remember: Receiving money NEVER requires entering a PIN.');
  }

  if (signalIds.has('cred_remote_access_trojan')) {
    actions.push('DO NOT install AnyDesk, TeamViewer, QuickSupport, or any remote desktop application.');
    actions.push('If already installed, immediately disconnect from Wi-Fi/mobile data and uninstall the app.');
  }

  if (signals.some((s) => s.category === 'suspicious_links')) {
    actions.push('DO NOT click any link in the message. Type the bank or service website directly into your browser.');
  }

  if (signals.some((s) => s.category === 'urgency_threats')) {
    actions.push('DO NOT panic. Scammers manufacture artificial deadlines to bypass logical verification.');
  }

  if (signals.some((s) => s.category === 'financial_pressure')) {
    actions.push('DO NOT make any upfront transfers, advance fee payments, or gift card/crypto purchases.');
  }

  // General protective baseline
  if (actions.length === 0) {
    actions.push('Do not respond to this message or provide personal or financial details.');
    actions.push('Verify the communication independently through verified official support channels.');
  }

  // 2. Prevention tips
  tips.push('Legitimate banks never threaten immediate account suspension over SMS without formal multi-channel notices.');
  tips.push('Never forward verification SMS or OTPs to unknown phone numbers.');
  if (scamType === 'investment_scam' || scamType === 'crypto_scam') {
    tips.push('All genuine financial investments carry market risk; guaranteed returns of 100%+ are always fraudulent.');
  }
  if (scamType === 'job_scam') {
    tips.push('Legitimate employers never ask candidates to pay for training materials, registration fees, or task security deposits.');
  }

  const helplineAdvice = language === 'hi'
    ? 'संदिग्ध वित्तीय धोखाधड़ी की शिकायत राष्ट्रीय साइबर अपराध हेल्पलाइन 1930 पर या cybercrime.gov.in पर तुरंत दर्ज करें।'
    : 'Report financial cybercrime immediately to your local cybercell or national fraud helpline (e.g. 1930 in India, IC3 in the US, Action Fraud in the UK).';

  return {
    recommendedActions: actions.slice(0, 4),
    preventionTips: tips.slice(0, 3),
    helplineOrReportingAdvice: helplineAdvice,
    disclaimer: 'This automated scam intelligence evaluation is provided for financial awareness and threat prevention. Always consult official financial institutions or local cybercrime authorities for verified security status.',
  };
}
