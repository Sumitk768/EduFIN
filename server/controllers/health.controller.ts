import { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.util';
import { config } from '../config/env';
import { getGeminiClient } from '../ai/gemini.client';

export class HealthController {
  getHealth(req: Request, res: Response) {
    const aiAvailable = !!getGeminiClient();

    const healthStatus = {
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      port: config.PORT,
      subsystems: {
        apiServer: 'UP',
        inMemoryDatabase: 'UP',
        geminiAIIntegration: aiAvailable ? 'CONFIGURED' : 'UNCONFIGURED_FALLBACK_MODE',
      },
    };

    return sendSuccess(res, healthStatus, 'EduFIN backend is operational');
  }

  getVersion(req: Request, res: Response) {
    const versionData = {
      name: config.APP_NAME,
      version: config.APP_VERSION,
      runtime: `Node.js ${process.version}`,
      platform: process.platform,
      arch: process.arch,
      apiBase: config.API_PREFIX,
      documentationEndpoint: '/api/docs',
    };

    return sendSuccess(res, versionData, 'EduFIN version metadata');
  }

  getApiDirectory(req: Request, res: Response) {
    const apiDirectory = {
      title: 'EduFIN Backend REST API Directory',
      version: config.APP_VERSION,
      description: 'AI-Powered Multilingual Financial Literacy Platform Backend Endpoints',
      routes: [
        { group: 'System', method: 'GET', path: '/api/health', desc: 'Liveness & readiness probe' },
        { group: 'System', method: 'GET', path: '/api/version', desc: 'Runtime & version info' },
        { group: 'System', method: 'GET', path: '/api/docs', desc: 'API directory catalogue' },
        { group: 'User Management', method: 'GET', path: '/api/v1/users', desc: 'List user profiles' },
        { group: 'User Management', method: 'POST', path: '/api/v1/users', desc: 'Create user profile' },
        { group: 'User Management', method: 'GET', path: '/api/v1/users/:id', desc: 'Get user profile' },
        { group: 'User Management', method: 'PATCH', path: '/api/v1/users/:id', desc: 'Update user profile' },
        { group: 'Financial Assessment', method: 'GET', path: '/api/v1/assessment/questions', desc: 'Get diagnostic questions' },
        { group: 'Financial Assessment', method: 'POST', path: '/api/v1/assessment/submit', desc: 'Submit diagnostic assessment' },
        { group: 'Financial Assessment', method: 'GET', path: '/api/v1/assessment/user/:userId/latest', desc: 'Get latest assessment score' },
        { group: 'Knowledge Base', method: 'GET', path: '/api/v1/knowledge/modules', desc: 'List learning modules' },
        { group: 'Knowledge Base', method: 'GET', path: '/api/v1/knowledge/modules/:id', desc: 'Get module details' },
        { group: 'Knowledge Base', method: 'GET', path: '/api/v1/knowledge/modules/:moduleId/lessons/:lessonId', desc: 'Get lesson content' },
        { group: 'Knowledge Base', method: 'GET', path: '/api/v1/knowledge/glossary', desc: 'List financial terms & analogies' },
        { group: 'Knowledge Base', method: 'GET', path: '/api/v1/knowledge/search', desc: 'Search curriculum & glossary' },
        { group: 'Knowledge Gap Detection', method: 'GET', path: '/api/v1/gaps/:userId', desc: 'Get evaluated knowledge gaps' },
        { group: 'Knowledge Gap Detection', method: 'POST', path: '/api/v1/gaps/:userId/evaluate', desc: 'Trigger AI gap evaluation' },
        { group: 'Personalized Learning Path', method: 'GET', path: '/api/v1/learning-path/:userId', desc: 'Get tailored curriculum path' },
        { group: 'Personalized Learning Path', method: 'POST', path: '/api/v1/learning-path/generate', desc: 'Generate customized path' },
        { group: 'Personalized Learning Path', method: 'PATCH', path: '/api/v1/learning-path/:userId/steps/:stepId', desc: 'Update step status' },
        { group: 'AI Financial Assistant', method: 'POST', path: '/api/v1/assistant/chat', desc: 'Multilingual financial literacy Q&A' },
        { group: 'AI Financial Assistant', method: 'POST', path: '/api/v1/assistant/explain-term', desc: 'Explain financial term with analogy' },
        { group: 'AI Question Generator', method: 'POST', path: '/api/v1/question-gen/generate', desc: 'Dynamically generate quiz scenarios' },
        { group: 'AI Question Generator', method: 'POST', path: '/api/v1/question-gen/validate', desc: 'Validate answer with feedback' },
        { group: 'Financial Simulators', method: 'POST', path: '/api/v1/simulators/compound-interest', desc: 'Compound interest calculator' },
        { group: 'Financial Simulators', method: 'POST', path: '/api/v1/simulators/loan-amortization', desc: 'Loan EMI & amortization schedule' },
        { group: 'Financial Simulators', method: 'POST', path: '/api/v1/simulators/inflation', desc: 'Inflation purchasing power simulator' },
        { group: 'Financial Simulators', method: 'POST', path: '/api/v1/simulators/emergency-fund', desc: 'Emergency fund target calculator' },
        { group: 'Financial Simulators', method: 'POST', path: '/api/v1/simulators/50-30-20', desc: '50/30/20 rule budget splitter' },
        { group: 'Financial Simulators', method: 'GET', path: '/api/v1/simulators/presets', desc: 'Preset calculation scenarios' },
        { group: 'Scam Message Checker', method: 'POST', path: '/api/v1/scam-checker/analyze', desc: 'AI fraud & phishing detector' },
        { group: 'Learning Progress Tracking', method: 'GET', path: '/api/v1/progress/:userId', desc: 'Get streaks, badges & proficiency' },
        { group: 'Learning Progress Tracking', method: 'POST', path: '/api/v1/progress/lesson-completed', desc: 'Record lesson completion' },
        { group: 'Learning Progress Tracking', method: 'POST', path: '/api/v1/progress/quiz-score', desc: 'Record quiz score' },
      ],
    };

    return sendSuccess(res, apiDirectory, 'EduFIN REST API Catalogue');
  }
}

export const healthController = new HealthController();
