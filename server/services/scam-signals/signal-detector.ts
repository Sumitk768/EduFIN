import { DetectedSignal, SignalCategory } from './signal-types';
import { detectFinancialPressureSignals } from './financial-pressure.signals';
import { detectCredentialHarvestingSignals } from './credential-harvesting.signals';
import { detectUrgencyThreatSignals } from './urgency-threats.signals';
import { detectImpersonationSignals } from './impersonation.signals';
import { detectInvestmentFraudSignals } from './investment-fraud.signals';
import { detectSuspiciousLinkSignals } from './suspicious-links.signals';
import { detectSocialEngineeringSignals } from './social-engineering.signals';

export class DeterministicSignalDetector {
  public detectAllSignals(messageText: string, senderInfo?: string): DetectedSignal[] {
    const combinedText = senderInfo ? `${senderInfo} \n ${messageText}` : messageText;

    const allSignals: DetectedSignal[] = [
      ...detectFinancialPressureSignals(combinedText),
      ...detectCredentialHarvestingSignals(combinedText),
      ...detectUrgencyThreatSignals(combinedText),
      ...detectImpersonationSignals(combinedText),
      ...detectInvestmentFraudSignals(combinedText),
      ...detectSuspiciousLinkSignals(combinedText),
      ...detectSocialEngineeringSignals(combinedText),
    ];

    // Deduplicate by signal ID
    const uniqueMap = new Map<string, DetectedSignal>();
    for (const sig of allSignals) {
      if (!uniqueMap.has(sig.id)) {
        uniqueMap.set(sig.id, sig);
      }
    }

    return Array.from(uniqueMap.values());
  }

  public getSignalsByCategory(signals: DetectedSignal[]): Record<SignalCategory, DetectedSignal[]> {
    const grouped: Record<SignalCategory, DetectedSignal[]> = {
      financial_pressure: [],
      credential_harvesting: [],
      urgency_threats: [],
      impersonation: [],
      investment_fraud: [],
      suspicious_links: [],
      social_engineering: [],
    };

    for (const sig of signals) {
      if (grouped[sig.category]) {
        grouped[sig.category].push(sig);
      }
    }

    return grouped;
  }
}

export const deterministicSignalDetector = new DeterministicSignalDetector();
