import { getGeminiClient } from '../ai/gemini.client';
import {
  AI_MODELS,
  SCAM_DETECTOR_SYSTEM_INSTRUCTION,
  SCAM_ANALYSIS_SCHEMA,
} from '../ai/prompts';
import { CheckScamRequest, ScamAnalysisResult } from '../models/scam-checker.model';
import { SIMULATOR_PRESETS } from '../data/initial-simulators';
import { logger } from '../utils/logger.util';

export class ScamCheckerService {
  async analyzeMessage(request: CheckScamRequest): Promise<ScamAnalysisResult> {
    const ai = getGeminiClient();

    if (!ai) {
      return this.heuristicScamAnalysis(request);
    }

    try {
      const prompt = `Analyze this message received via channel "${request.channel}":
Message Content: "${request.messageText}"
Sender Info: ${request.senderInfo || 'Unknown'}
User Language: ${request.language}

Evaluate if this message represents a financial scam, phishing attempt, lottery fraud, or social engineering tactic. Respond in JSON.`;

      const response = await ai.models.generateContent({
        model: AI_MODELS.DEFAULT,
        contents: prompt,
        config: {
          systemInstruction: SCAM_DETECTOR_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: SCAM_ANALYSIS_SCHEMA,
        },
      });

      const text = response.text;
      if (!text) {
        return this.heuristicScamAnalysis(request);
      }

      const parsed: ScamAnalysisResult = JSON.parse(text);
      return parsed;
    } catch (err: any) {
      logger.error('Gemini Scam Checker error:', err.message);
      return this.heuristicScamAnalysis(request);
    }
  }

  private heuristicScamAnalysis(request: CheckScamRequest): ScamAnalysisResult {
    const text = request.messageText.toLowerCase();
    const signatures = SIMULATOR_PRESETS.scamPatternSignatures;

    const matchedFlags: string[] = [];
    const suspiciousElements: { element: string; reason: string }[] = [];
    let riskScore = 15;
    let urgencyDetected = false;
    let scamType = 'Uncertain / Informational';

    if (text.includes('urgent') || text.includes('immediately') || text.includes('15 min') || text.includes('expire') || text.includes('suspended')) {
      urgencyDetected = true;
      matchedFlags.push('High artificial urgency forcing quick action without verification');
      suspiciousElements.push({ element: 'Urgency keywords', reason: 'Scammers create panic to bypass critical reasoning' });
      riskScore += 35;
    }

    if (text.includes('otp') || text.includes('pin') || text.includes('password') || text.includes('cvv')) {
      matchedFlags.push('Explicit solicitation of confidential authentication credentials (OTP/PIN)');
      suspiciousElements.push({ element: 'Credential solicitation', reason: 'Legitimate institutions never ask for OTP or PIN' });
      riskScore += 45;
    }

    if (text.includes('http://') || text.includes('.cc') || text.includes('.xyz') || text.includes('bit.ly') || text.includes('tinyurl')) {
      matchedFlags.push('Unverified or suspicious hyperlink in message');
      suspiciousElements.push({ element: 'Suspicious URL', reason: 'Shortened or unofficial domain links used for credential harvesting' });
      riskScore += 30;
    }

    if (text.includes('won') || text.includes('lottery') || text.includes('prize') || text.includes('reward')) {
      matchedFlags.push('Unsolicited lottery or prize winnings claim');
      scamType = 'Advance Fee / Lottery Scam';
      riskScore += 35;
    }

    if (text.includes('kyc') && (text.includes('block') || text.includes('deactivate'))) {
      matchedFlags.push('Impersonation of bank KYC deactivation threat');
      scamType = 'Banking KYC Phishing Scam';
      riskScore += 40;
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    let riskLevel: 'safe' | 'suspicious' | 'dangerous' | 'critical_scam' = 'safe';
    if (riskScore >= 80) riskLevel = 'critical_scam';
    else if (riskScore >= 50) riskLevel = 'dangerous';
    else if (riskScore >= 25) riskLevel = 'suspicious';

    return {
      scamRiskScore: riskScore,
      riskLevel,
      detectedScamType: scamType,
      redFlags: matchedFlags.length > 0 ? matchedFlags : ['No overt malicious triggers detected, but remain vigilant.'],
      explanation: riskScore > 40
        ? 'This message displays classic fraud characteristics, including urgency triggers and suspicious links designed to harvest personal credentials.'
        : 'This message does not present immediate typical scam signatures. However, always verify unknown senders before clicking links.',
      urgencyTacticDetected: urgencyDetected,
      suspiciousElementsFound: suspiciousElements,
      safeActionRecommendations: [
        'Do NOT click any links in the message.',
        'NEVER share OTPs, passwords, or UPI PINs.',
        'Contact the official institution directly via their verified website or phone number printed on your card.',
      ],
      helplineOrReportingAdvice: 'Report phishing SMS to your local cybercrime portal or national fraud helpline (e.g. 1930 in India, reportphishing@apwg.org internationally).',
    };
  }
}

export const scamCheckerService = new ScamCheckerService();
