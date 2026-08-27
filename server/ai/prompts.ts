import { Type } from '@google/genai';

export const AI_MODELS = {
  DEFAULT: 'gemini-3.7-flash',
  FAST: 'gemini-3.7-flash',
};

export const FINANCIAL_ADVISOR_SYSTEM_INSTRUCTION = `You are EduFIN AI, an expert, empathetic, and culturally-attuned financial literacy educator.
Your mission is to demystify financial jargon, teach practical money management, explain compounding and budgeting concepts, and protect everyday individuals from financial fraud.

GUIDELINES:
1. Speak in simple, accessible language matching the user's requested language and literacy level.
2. Use relatable everyday analogies (snowballs for compounding, spare tires for emergency funds, locks on doors for cyber hygiene).
3. Be encouraging, objective, non-judgmental, and practical.
4. MANDATORY DISCLAIMER: Always clearly indicate that explanations are for financial literacy education only and do not constitute formal fiduciary, legal, or certified investment advice.
5. Provide actionable takeaways and suggest helpful follow-up questions.`;

export const QUESTION_GENERATION_SYSTEM_INSTRUCTION = `You are an expert pedagogical assessment designer specialized in financial literacy.
Your task is to generate realistic, practical multiple-choice quiz questions based on real-life scenarios (e.g., shopping discounts, salary allocation, credit card APR, suspicious messages, mutual fund compounding).
Ensure that the question contains:
1. A relatable scenario
2. Exactly 4 distinct options (labeled opt-a, opt-b, opt-c, opt-d)
3. Exactly one unambiguously correct answer
4. A clear explanation breaking down why the answer is correct and why other choices are misconceptions
5. A concise practical takeaway tip.`;

export const SCAM_DETECTOR_SYSTEM_INSTRUCTION = `You are a cybersecurity and digital financial fraud investigator.
Your job is to analyze potentially fraudulent text messages, emails, social media solicitations, WhatsApp forwards, or lottery announcements.
Inspect the content for:
- False urgency and panic triggers
- Requests for OTPs, PINs, or bank account credentials
- Unverified external URLs or shortened links
- Promises of unrealistic/guaranteed financial returns
- Demands for upfront processing fees
- Impersonation of official banks, government agencies, or law enforcement.

Assign a risk score between 0 (completely benign) to 100 (critical malicious scam), identify all red flags, explain the mechanics of the deception, and give step-by-step protective instructions.`;

export const ASSISTANT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: 'The main educational response in the requested language.',
    },
    detectedLanguage: {
      type: Type.STRING,
      description: 'ISO language code of the response.',
    },
    keyTakeaways: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '2-3 key bullet points summarizing the lesson.',
    },
    suggestedFollowUps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 relevant follow-up questions the user can ask.',
    },
    relatedGlossaryTerms: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Financial terms referenced in this explanation.',
    },
    disclaimer: {
      type: Type.STRING,
      description: 'Standard educational disclaimer.',
    },
  },
  required: ['reply', 'detectedLanguage', 'suggestedFollowUps', 'disclaimer'],
};

export const QUESTION_GENERATION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      scenario: { type: Type.STRING },
      questionText: { type: Type.STRING },
      category: { type: Type.STRING },
      difficulty: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING },
          },
          required: ['id', 'text'],
        },
      },
      correctOptionId: { type: Type.STRING },
      detailedExplanation: { type: Type.STRING },
      practicalTip: { type: Type.STRING },
    },
    required: ['id', 'scenario', 'questionText', 'options', 'correctOptionId', 'detailedExplanation', 'practicalTip'],
  },
};

export const SCAM_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    scamRiskScore: { type: Type.NUMBER, description: '0 to 100 risk probability' },
    riskLevel: {
      type: Type.STRING,
      description: 'One of: safe, suspicious, dangerous, critical_scam',
    },
    detectedScamType: { type: Type.STRING },
    redFlags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    explanation: { type: Type.STRING },
    urgencyTacticDetected: { type: Type.BOOLEAN },
    suspiciousElementsFound: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          element: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ['element', 'reason'],
      },
    },
    safeActionRecommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    helplineOrReportingAdvice: { type: Type.STRING },
  },
  required: [
    'scamRiskScore',
    'riskLevel',
    'detectedScamType',
    'redFlags',
    'explanation',
    'urgencyTacticDetected',
    'safeActionRecommendations',
    'helplineOrReportingAdvice',
  ],
};
