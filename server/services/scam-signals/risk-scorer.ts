import { DetectedSignal, RiskSeverity, ScamType, SignalCategory } from './signal-types';

export interface ScoreCalculationResult {
  riskScore: number;
  severity: RiskSeverity;
  riskLevel: 'safe' | 'suspicious' | 'dangerous' | 'critical_scam';
  scamType: ScamType;
  confidence: number;
  urgencyDetected: boolean;
  scoreBreakdown: {
    categoryScores: Record<SignalCategory, number>;
    synergyBonus: number;
    rawTotal: number;
    boundedScore: number;
  };
}

export class DeterministicRiskScorer {
  /**
   * Computes a deterministic, explainable, bounded risk score (0-100).
   */
  public calculateRisk(signals: DetectedSignal[]): ScoreCalculationResult {
    if (signals.length === 0) {
      return {
        riskScore: 5,
        severity: 'benign',
        riskLevel: 'safe',
        scamType: 'benign',
        confidence: 0.95,
        urgencyDetected: false,
        scoreBreakdown: {
          categoryScores: {
            financial_pressure: 0,
            credential_harvesting: 0,
            urgency_threats: 0,
            impersonation: 0,
            investment_fraud: 0,
            suspicious_links: 0,
            social_engineering: 0,
          },
          synergyBonus: 0,
          rawTotal: 0,
          boundedScore: 5,
        },
      };
    }

    // 1. Group signals by category
    const categoryMap: Record<SignalCategory, DetectedSignal[]> = {
      financial_pressure: [],
      credential_harvesting: [],
      urgency_threats: [],
      impersonation: [],
      investment_fraud: [],
      suspicious_links: [],
      social_engineering: [],
    };

    for (const sig of signals) {
      categoryMap[sig.category].push(sig);
    }

    // 2. Compute category scores with diminishing returns for intra-category duplicates
    const categoryScores: Record<SignalCategory, number> = {
      financial_pressure: 0,
      credential_harvesting: 0,
      urgency_threats: 0,
      impersonation: 0,
      investment_fraud: 0,
      suspicious_links: 0,
      social_engineering: 0,
    };

    for (const cat of Object.keys(categoryMap) as SignalCategory[]) {
      const catSignals = categoryMap[cat];
      if (catSignals.length === 0) continue;

      // Sort descending by severity
      catSignals.sort((a, b) => b.severityContribution - a.severityContribution);

      let catTotal = 0;
      for (let i = 0; i < catSignals.length; i++) {
        const weight = i === 0 ? 1.0 : i === 1 ? 0.5 : 0.25;
        catTotal += catSignals[i].severityContribution * weight;
      }
      categoryScores[cat] = Math.round(catTotal);
    }

    // 3. Compute cross-category synergy bonuses
    let synergyBonus = 0;

    const hasCreds = categoryScores.credential_harvesting > 0;
    const hasUrgency = categoryScores.urgency_threats > 0;
    const hasImp = categoryScores.impersonation > 0;
    const hasLink = categoryScores.suspicious_links > 0;
    const hasInv = categoryScores.investment_fraud > 0;
    const hasFin = categoryScores.financial_pressure > 0;
    const hasSoc = categoryScores.social_engineering > 0;

    // Classic phishing combo: Credentials + Urgency or Link
    if (hasCreds && (hasUrgency || hasLink)) {
      synergyBonus += 15;
    }

    // Impersonation + Link/Payment combo
    if (hasImp && (hasLink || hasFin)) {
      synergyBonus += 12;
    }

    // Investment promise + Advance fee / Untraceable payment
    if (hasInv && hasFin) {
      synergyBonus += 15;
    }

    // Social Engineering (Lottery/Emergency) + Advance fee
    if (hasSoc && hasFin) {
      synergyBonus += 12;
    }

    // 4. Calculate total and bounded score
    const categorySum = Object.values(categoryScores).reduce((acc, v) => acc + v, 0);
    const rawTotal = categorySum + synergyBonus;
    const boundedScore = Math.min(100, Math.max(0, Math.round(rawTotal)));

    // 5. Derive Severity & Risk Level
    let severity: RiskSeverity = 'benign';
    let riskLevel: 'safe' | 'suspicious' | 'dangerous' | 'critical_scam' = 'safe';

    if (boundedScore >= 90) {
      severity = 'critical';
      riskLevel = 'critical_scam';
    } else if (boundedScore >= 70) {
      severity = 'high';
      riskLevel = boundedScore >= 80 ? 'critical_scam' : 'dangerous';
    } else if (boundedScore >= 40) {
      severity = 'moderate';
      riskLevel = boundedScore >= 50 ? 'dangerous' : 'suspicious';
    } else if (boundedScore >= 20) {
      severity = 'low';
      riskLevel = 'suspicious';
    } else {
      severity = 'benign';
      riskLevel = 'safe';
    }

    // 6. Infer Scam Type based on strongest signal pattern
    const scamType = this.classifyScamType(categoryScores, signals);

    // 7. Calculate Confidence (0.75 - 0.98 based on signal strength and diversity)
    const activeCategoriesCount = Object.values(categoryScores).filter((s) => s > 0).length;
    const confidence = Math.min(
      0.98,
      Math.max(0.75, 0.75 + activeCategoriesCount * 0.05 + signals.length * 0.02)
    );

    return {
      riskScore: boundedScore,
      severity,
      riskLevel,
      scamType,
      confidence: parseFloat(confidence.toFixed(2)),
      urgencyDetected: hasUrgency,
      scoreBreakdown: {
        categoryScores,
        synergyBonus,
        rawTotal,
        boundedScore,
      },
    };
  }

  private classifyScamType(
    categoryScores: Record<SignalCategory, number>,
    signals: DetectedSignal[]
  ): ScamType {
    const signalIds = new Set(signals.map((s) => s.id));

    if (signalIds.has('cred_otp_solicitation') || signalIds.has('cred_kyc_document_exfiltration')) {
      return 'otp_kyc_scam';
    }

    if (signalIds.has('inv_guaranteed_returns_zero_risk') || signalIds.has('inv_double_money_ponzi')) {
      return 'investment_scam';
    }

    if (signalIds.has('inv_crypto_arbitrage_forex_trap')) {
      return 'crypto_scam';
    }

    if (signalIds.has('inv_fake_instant_loan_preapproval')) {
      return 'loan_scam';
    }

    if (signalIds.has('imp_job_task_recruitment')) {
      return 'job_scam';
    }

    if (signalIds.has('soc_unsolicited_lottery_prize_lure')) {
      return 'lottery_prize_scam';
    }

    if (signalIds.has('imp_bank_financial_institution') || signalIds.has('urg_account_suspension_threat')) {
      return 'banking_fraud';
    }

    if (signalIds.has('imp_courier_delivery_service') || signalIds.has('fin_overpayment_scam')) {
      return 'delivery_refund_scam';
    }

    if (signalIds.has('soc_family_emergency_impersonation') || signalIds.has('soc_romance_pig_butchering_lure')) {
      return 'romance_social_engineering';
    }

    if (signalIds.has('fin_upi_pin_receive_deception') || signalIds.has('fin_unusual_payment_method')) {
      return 'payment_scam';
    }

    if (signalIds.has('link_typosquatting_phishing_domain') || signalIds.has('link_raw_ip_address_host')) {
      return 'phishing';
    }

    if (categoryScores.credential_harvesting > 0 || categoryScores.suspicious_links > 0) {
      return 'phishing';
    }

    if (categoryScores.impersonation > 0) {
      return 'impersonation';
    }

    if (categoryScores.financial_pressure > 0) {
      return 'payment_scam';
    }

    if (categoryScores.investment_fraud > 0) {
      return 'investment_scam';
    }

    return 'other';
  }
}

export const deterministicRiskScorer = new DeterministicRiskScorer();
