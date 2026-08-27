import { getGeminiClient } from '../ai/gemini.client';
import {
  AI_MODELS,
  FINANCIAL_ADVISOR_SYSTEM_INSTRUCTION,
  ASSISTANT_RESPONSE_SCHEMA,
} from '../ai/prompts';
import {
  AssistantQueryRequest,
  AssistantResponse,
  ExplainTermRequest,
} from '../models/assistant.model';
import { knowledgeRepository } from '../repositories/knowledge.repository';
import { logger } from '../utils/logger.util';

export class AssistantService {
  async askFinancialTutor(request: AssistantQueryRequest): Promise<AssistantResponse> {
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback deterministic response when Gemini API key is not yet configured
      return this.buildFallbackResponse(request);
    }

    try {
      const languageInstruction = `Please reply in ${request.language} language. Target literacy level: ${request.userLevel}.`;
      const contextPrompt = request.contextCategory
        ? `Focus context category: ${request.contextCategory}`
        : '';

      const historyFormatted = request.conversationHistory
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

      const fullPrompt = `${languageInstruction}\n${contextPrompt}\n\nConversation History:\n${historyFormatted}\n\nUSER QUESTION: ${request.message}`;

      const response = await ai.models.generateContent({
        model: AI_MODELS.DEFAULT,
        contents: fullPrompt,
        config: {
          systemInstruction: FINANCIAL_ADVISOR_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: ASSISTANT_RESPONSE_SCHEMA,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response received from Gemini model.');
      }

      const parsed: AssistantResponse = JSON.parse(responseText);
      return parsed;
    } catch (err: any) {
      logger.error('Gemini AI Assistant error:', err.message);
      return this.buildFallbackResponse(request);
    }
  }

  async explainTerm(request: ExplainTermRequest): Promise<AssistantResponse> {
    // Check local knowledge glossary first
    const terms = await knowledgeRepository.getGlossaryTerms(request.language);
    const matched = terms.find((t) => t.term.toLowerCase().includes(request.term.toLowerCase()));

    if (matched) {
      return {
        reply: `${matched.definition}\n\n💡 **Simple Analogy**: ${matched.simpleAnalogy}\n\n📌 **Example**: ${matched.example}`,
        detectedLanguage: matched.language,
        keyTakeaways: [matched.definition, matched.simpleAnalogy],
        suggestedFollowUps: [
          `How does ${matched.term} affect my monthly budget?`,
          `What are the most common mistakes related to ${matched.term}?`,
          `How can I start using this concept today?`,
        ],
        relatedGlossaryTerms: [matched.term],
        disclaimer: 'For financial literacy and educational purposes only.',
      };
    }

    // Otherwise invoke AI
    return this.askFinancialTutor({
      message: `Explain the financial term "${request.term}" simply with a real-life analogy, example, and practical takeaway.`,
      language: request.language,
      userLevel: request.targetLevel,
      conversationHistory: [],
    });
  }

  private buildFallbackResponse(request: AssistantQueryRequest): AssistantResponse {
    const q = request.message.toLowerCase();
    let reply = `Thank you for your question about financial management. Learning how to budget, save, and invest consistently is the key foundation to long-term financial security.`;
    let keyTakeaways = [
      'Maintain an emergency fund of 3-6 months of expenses.',
      'Follow the 50/30/20 rule to keep spending intentional.',
      'Always beware of urgent messages demanding OTPs or upfront payments.',
    ];
    let relatedTerms = ['Emergency Fund', 'Compound Interest', '50/30/20 Rule'];

    if (q.includes('compound') || q.includes('interest')) {
      reply = `Compound interest is the interest you earn on both your original principal and accumulated interest over time. Over decades, it can turn small regular deposits into substantial wealth.`;
      keyTakeaways = [
        'Time in the market is more powerful than timing the market.',
        'Starting 10 years earlier can more than double your final balance.',
      ];
      relatedTerms = ['Compound Interest', 'Annual Percentage Yield'];
    } else if (q.includes('scam') || q.includes('fraud') || q.includes('otp')) {
      reply = `Legitimate financial institutions and government agencies will never ask for your passwords, OTP codes, or PINs over the phone or SMS. Always verify suspicious requests through official contacts.`;
      keyTakeaways = [
        'Never share OTPs with anyone.',
        'Beware of false urgency and threat of account deactivation.',
      ];
      relatedTerms = ['Phishing', 'OTP Protection'];
    }

    return {
      reply,
      detectedLanguage: request.language,
      keyTakeaways,
      suggestedFollowUps: [
        'How can I calculate my emergency fund size?',
        'What is the 50/30/20 budget framework?',
        'How do I detect a phishing SMS scam?',
      ],
      relatedGlossaryTerms: relatedTerms,
      disclaimer: 'EduFIN Assistant provides financial literacy guidance for educational purposes only.',
    };
  }
}

export const assistantService = new AssistantService();
