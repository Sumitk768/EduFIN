import { DetectedSignal } from './signal-types';

function extractSnippet(text: string, matchIndex: number, length: number): string {
  const start = Math.max(0, matchIndex - 15);
  const end = Math.min(text.length, matchIndex + length + 25);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.substring(start, end).trim()}${suffix}`;
}

export function detectCredentialHarvestingSignals(text: string): DetectedSignal[] {
  const signals: DetectedSignal[] = [];

  // 1. Explicit OTP / 6-digit Code Request
  const otpRegex = /\b(share\s+(the\s+)?(otp|one\s*time\s*password|verification\s*code|6\s*digit\s*code)|send\s+(the\s+)?otp|enter\s+(the\s+)?otp\s+here|otp\s+batao|forward\s+the\s+code|share\s+(the\s+)?code|otp\s+sent\s+to\s+your\s+phone)\b/i;
  const otpMatch = text.match(otpRegex);
  if (otpMatch && otpMatch.index !== undefined) {
    signals.push({
      id: 'cred_otp_solicitation',
      category: 'credential_harvesting',
      name: 'Explicit Solicitation of OTP / 2FA Code',
      severityContribution: 55,
      explanation: 'Requests your One-Time Password (OTP) or authentication code. Legitimate banks and service providers NEVER ask for your OTP.',
      evidenceSnippet: extractSnippet(text, otpMatch.index, otpMatch[0].length),
    });
  }

  // 2. PIN, Password, or CVV Solicitation
  const pinCvvRegex = /\b(provide\s+(your\s+)?(atm\s*pin|upi\s*pin|pin|cvv|password)|enter\s+(your\s+)?(pin|atm\s*pin|upi\s*pin|password|cvv|security\s*code|netbanking\s*password)|atm\s*pin|upi\s*pin|\bcvv\b|card\s*number\s+and\s+cvv)\b/i;
  const pinCvvMatch = text.match(pinCvvRegex);
  if (pinCvvMatch && pinCvvMatch.index !== undefined) {
    signals.push({
      id: 'cred_pin_cvv_password_solicitation',
      category: 'credential_harvesting',
      name: 'Request for PIN, CVV, or Secret Password',
      severityContribution: 55,
      explanation: 'Demands sensitive secret credentials (PIN, CVV, password) which grants direct unauthorized access to withdraw money or hijack accounts.',
      evidenceSnippet: extractSnippet(text, pinCvvMatch.index, pinCvvMatch[0].length),
    });
  }

  // 3. Banking / Netbanking Login Solicitation
  const netbankingRegex = /\b(login\s+to\s+verify\s+account|update\s+netbanking\s+credentials|verify\s+login\s+details|enter\s+internet\s+banking\s+user\s*id)\b/i;
  const netbankingMatch = text.match(netbankingRegex);
  if (netbankingMatch && netbankingMatch.index !== undefined) {
    signals.push({
      id: 'cred_netbanking_login_solicitation',
      category: 'credential_harvesting',
      name: 'Netbanking Login Redirection / Phishing',
      severityContribution: 40,
      explanation: 'Prompts you to input online banking credentials via an unverified link or message.',
      evidenceSnippet: extractSnippet(text, netbankingMatch.index, netbankingMatch[0].length),
    });
  }

  // 4. KYC Identity Document Exfiltration (Aadhaar, PAN, SSN, Passport, KYC)
  const kycDocRegex = /\b((verify|update|complete|upload)\s+(your\s+)?(kyc|pan\s*card|aadhaar\s*card|ssn|social\s*security\s*number|passport|id\s*proof)|update\s+(pan|aadhaar|kyc)\s+details\s+immediately|send\s+id\s+photos)\b/i;
  const kycDocMatch = text.match(kycDocRegex);
  if (kycDocMatch && kycDocMatch.index !== undefined) {
    signals.push({
      id: 'cred_kyc_document_exfiltration',
      category: 'credential_harvesting',
      name: 'Unverified KYC Identity Document Exfiltration',
      severityContribution: 35,
      explanation: 'Demands identity documents (Aadhaar, PAN, SSN, Passport) outside of secure official mobile banking applications.',
      evidenceSnippet: extractSnippet(text, kycDocMatch.index, kycDocMatch[0].length),
    });
  }

  // 5. Remote Access / Screen Sharing App Installation (AnyDesk, TeamViewer, RustDesk)
  const remoteAppRegex = /\b(install\s+(anydesk|teamviewer|rustdesk|quicksupport|screen\s*share|airmirror)|download\s+support\s+apk|allow\s+remote\s+access)\b/i;
  const remoteAppMatch = text.match(remoteAppRegex);
  if (remoteAppMatch && remoteAppMatch.index !== undefined) {
    signals.push({
      id: 'cred_remote_access_trojan',
      category: 'credential_harvesting',
      name: 'Remote Access App Installation Solicitation',
      severityContribution: 50,
      explanation: 'Instructs you to install screen-sharing or remote desktop tools (AnyDesk, TeamViewer, QuickSupport), allowing attackers to view screens and steal OTPs.',
      evidenceSnippet: extractSnippet(text, remoteAppMatch.index, remoteAppMatch[0].length),
    });
  }

  return signals;
}
