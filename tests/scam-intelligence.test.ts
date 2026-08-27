import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ScamCheckerService } from '../server/services/scam-checker.service';
import { MockAIProvider } from '../server/ai/mock-ai.provider';
import { deterministicSignalDetector } from '../server/services/scam-signals/signal-detector';
import { deterministicRiskScorer } from '../server/services/scam-signals/risk-scorer';
import { repositoryFactory } from '../server/repositories/factory';
import { CheckScamRequestSchema } from '../server/models/scam-checker.model';

describe('EduFIN Phase 4C — Scam Intelligence Engine Test Suite', () => {
  let mockAI: MockAIProvider;
  let service: ScamCheckerService;

  beforeEach(() => {
    mockAI = new MockAIProvider();
    service = new ScamCheckerService(mockAI);
    repositoryFactory.setMode('in_memory');
  });

  // 1. Benign Message
  it('1. should accurately classify a benign transactional message with low risk score and safe severity', async () => {
    const benignMessage = 'Your monthly credit card statement for May is ready. Total due $45.00 by June 15. View on our official banking app.';
    
    mockAI.queueStructuredResponse({
      scamType: 'benign',
      riskScore: 5,
      severity: 'benign',
      confidence: 0.95,
      explanation: 'Standard informational billing notification with no malicious solicitation.',
      redFlags: [],
      urgencyTacticDetected: false,
      recommendedActions: ['Review statement inside official mobile app.'],
      preventionTips: ['Maintain monthly budgeting routines.'],
    });

    const result = await service.analyzeMessage({
      messageText: benignMessage,
      channel: 'sms',
      language: 'en',
    });

    assert.ok(result.riskScore < 20, `Expected riskScore < 20, got ${result.riskScore}`);
    assert.strictEqual(result.severity, 'benign');
    assert.strictEqual(result.riskLevel, 'safe');
    assert.strictEqual(result.scamType, 'benign');
    assert.strictEqual(result.urgencyTacticDetected, false);
    assert.ok(result.recommendedActions.length > 0);
    assert.ok(result.disclaimer.length > 0);
  });

  // 2. OTP Scam
  it('2. should detect explicit OTP/2FA credential solicitation with high/critical risk and actionable defensive guidance', async () => {
    const otpScam = 'Dear customer, your bank transaction is pending. Share the OTP sent to your phone immediately to verify.';
    
    const signals = deterministicSignalDetector.detectAllSignals(otpScam);
    assert.ok(signals.some((s) => s.id === 'cred_otp_solicitation'));

    const result = await service.analyzeMessage({
      messageText: otpScam,
      channel: 'sms',
    });

    assert.ok(result.riskScore >= 70, `Expected riskScore >= 70, got ${result.riskScore}`);
    assert.ok(result.severity === 'high' || result.severity === 'critical');
    assert.ok(result.recommendedActions.some((a) => a.includes('OTP')));
  });

  // 3. Banking Impersonation & KYC Threat
  it('3. should detect bank brand impersonation and account suspension threat', async () => {
    const bankScam = 'Dear SBI user, your account will be suspended today due to pending KYC update. Click https://sbi-kyc-verify.xyz to update now.';
    
    const signals = deterministicSignalDetector.detectAllSignals(bankScam);
    assert.ok(signals.some((s) => s.id === 'imp_bank_financial_institution'));
    assert.ok(signals.some((s) => s.id === 'urg_account_suspension_threat'));
    assert.ok(signals.some((s) => s.category === 'suspicious_links'));

    const result = await service.analyzeMessage({
      messageText: bankScam,
      channel: 'sms',
    });

    assert.ok(result.riskScore >= 80, `Expected riskScore >= 80, got ${result.riskScore}`);
    assert.ok(result.urgencyTacticDetected);
    assert.strictEqual(result.riskLevel, 'critical_scam');
  });

  // 4. Investment & Ponzi Scam
  it('4. should flag guaranteed returns and 2x wealth multiplication as investment scam', async () => {
    const investScam = 'Invest $500 today in our VIP arbitrage trading group and get guaranteed returns of $1000 in 24 hours! 100% risk free!';
    
    const signals = deterministicSignalDetector.detectAllSignals(investScam);
    assert.ok(signals.some((s) => s.id === 'inv_guaranteed_returns_zero_risk'));
    assert.ok(signals.some((s) => s.id === 'inv_double_money_ponzi'));

    const scoring = deterministicRiskScorer.calculateRisk(signals);
    assert.strictEqual(scoring.scamType, 'investment_scam');
    assert.ok(scoring.riskScore >= 70);
  });

  // 5. Loan Scam
  it('5. should identify instant no-verification pre-approved loan with advance fee demand', async () => {
    const loanScam = 'Congratulations! Pre-approved loan of $50,000 without documents. Pay $200 processing fee to release funds immediately.';
    
    const signals = deterministicSignalDetector.detectAllSignals(loanScam);
    assert.ok(signals.some((s) => s.id === 'inv_fake_instant_loan_preapproval'));
    assert.ok(signals.some((s) => s.id === 'fin_advance_fee'));

    const result = await service.analyzeMessage({
      messageText: loanScam,
      channel: 'sms',
    });

    assert.ok(result.riskScore >= 70);
    assert.ok(result.recommendedActions.some((a) => a.toLowerCase().includes('advance') || a.toLowerCase().includes('transfer')));
  });

  // 6. Job & Task Scam
  it('6. should detect part-time task / work-from-home prepaid Telegram job scam', async () => {
    const jobScam = 'Hiring part time job: Earn $300 daily simply by like youtube videos to earn. Contact HR manager on Telegram @task_job.';
    
    const signals = deterministicSignalDetector.detectAllSignals(jobScam);
    assert.ok(signals.some((s) => s.id === 'imp_job_task_recruitment'));

    const scoring = deterministicRiskScorer.calculateRisk(signals);
    assert.strictEqual(scoring.scamType, 'job_scam');
    assert.ok(scoring.riskScore >= 35);
  });

  // 7. Lottery / Prize Scam
  it('7. should flag unsolicited lottery winning claim', async () => {
    const lotteryScam = 'You have won $1,000,000 in the international lucky draw winner selection. Contact clearance charge office now.';
    
    const signals = deterministicSignalDetector.detectAllSignals(lotteryScam);
    assert.ok(signals.some((s) => s.id === 'soc_unsolicited_lottery_prize_lure'));

    const scoring = deterministicRiskScorer.calculateRisk(signals);
    assert.strictEqual(scoring.scamType, 'lottery_prize_scam');
    assert.ok(scoring.riskScore >= 40);
  });

  // 8. Suspicious Links & Obfuscated URL Shorteners
  it('8. should identify high-risk domain TLDs and URL shortener obfuscation', async () => {
    const linkScam = 'Your package delivery failed. Confirm your address at https://bit.ly/3xX9aZ or https://track-parcel.xyz/update';
    
    const signals = deterministicSignalDetector.detectAllSignals(linkScam);
    assert.ok(signals.some((s) => s.id === 'link_url_shortener_obfuscation'));
    assert.ok(signals.some((s) => s.id === 'link_suspicious_tld_domain'));
    assert.ok(signals.some((s) => s.id === 'imp_courier_delivery_service'));
  });

  // 9. Payment Pressure & Untraceable Gift Cards / Crypto
  it('9. should flag payment demands involving gift cards or crypto wallets', async () => {
    const paymentScam = 'IRS legal notice: Pay your pending tax penalty now using Apple gift card or bitcoin wallet immediately.';
    
    const signals = deterministicSignalDetector.detectAllSignals(paymentScam);
    assert.ok(signals.some((s) => s.id === 'fin_unusual_payment_method'));
    assert.ok(signals.some((s) => s.id === 'urg_legal_prosecution_threat'));

    const result = await service.analyzeMessage({
      messageText: paymentScam,
      channel: 'sms',
    });

    assert.ok(result.riskScore >= 80);
    assert.strictEqual(result.riskLevel, 'critical_scam');
  });

  // 10. Urgency & Legal Threat / Digital Arrest
  it('10. should detect severe legal threats and police arrest intimidations', async () => {
    const threatScam = 'CBI Police Action: Arrest warrant issued for money laundering. Immediate action required urgently within 15 minutes.';
    
    const signals = deterministicSignalDetector.detectAllSignals(threatScam);
    assert.ok(signals.some((s) => s.id === 'urg_legal_prosecution_threat'));
    assert.ok(signals.some((s) => s.id === 'urg_tight_countdown_pressure'));
  });

  // 11. Credential Request (PIN, Password, CVV)
  it('11. should catch explicit PIN/CVV/Password theft attempts', async () => {
    const credScam = 'Please provide your ATM PIN and CVV to unfreeze your debit card.';
    
    const signals = deterministicSignalDetector.detectAllSignals(credScam);
    assert.ok(signals.some((s) => s.id === 'cred_pin_cvv_password_solicitation'));
    
    const scoring = deterministicRiskScorer.calculateRisk(signals);
    assert.ok(scoring.riskScore >= 45);
  });

  // 12. Multiple Simultaneous Scam Signals (Compound bounded scoring)
  it('12. should calculate bounded (<=100) score with cross-category synergy for compound multi-signal attacks', async () => {
    const superScam = 'Dear HDFC customer, your account will be suspended in 15 mins! Share the OTP and your UPI PIN now to verify at https://hdfc-security.top or police arrest warrant will be issued.';
    
    const signals = deterministicSignalDetector.detectAllSignals(superScam);
    assert.ok(signals.length >= 4, `Expected at least 4 signals, got ${signals.length}`);

    const scoring = deterministicRiskScorer.calculateRisk(signals);
    assert.ok(scoring.riskScore <= 100, 'Score must never exceed 100');
    assert.ok(scoring.riskScore >= 90, `Expected score >= 90 for compound attack, got ${scoring.riskScore}`);
    assert.strictEqual(scoring.severity, 'critical');
    assert.strictEqual(scoring.riskLevel, 'critical_scam');
    assert.ok(scoring.scoreBreakdown.synergyBonus > 0, 'Synergy bonus should be applied');
  });

  // 13. Ambiguous Message
  it('13. should handle ambiguous messages with moderate score and explainable evidence', async () => {
    const ambiguous = 'Special discount offer expires today for select customers. Click to see details: https://promo.example.com';
    
    const result = await service.analyzeMessage({
      messageText: ambiguous,
      channel: 'sms',
    });

    assert.ok(result.riskScore >= 0 && result.riskScore <= 100);
    assert.ok(result.redFlags.length > 0);
    assert.ok(result.disclaimer.length > 0);
  });

  // 14. Fallback Behavior when AI is unavailable
  it('14. should seamlessly fall back to deterministic signal analysis when AI provider throws an error', async () => {
    // Force AI error
    mockAI.setAvailable(false);

    const otpMessage = 'Urgent: Your account is blocked. Share the OTP now to unblock.';
    
    const result = await service.analyzeMessage({
      messageText: otpMessage,
      channel: 'sms',
    });

    assert.ok(result !== null);
    assert.ok(result.riskScore >= 70, `Deterministic fallback should still calculate high score, got ${result.riskScore}`);
    assert.ok(result.redFlags.length > 0);
    assert.ok(result.evidence.length > 0);
    assert.ok(result.recommendedActions.length > 0);
    assert.strictEqual(result.urgencyTacticDetected, true);
  });

  // 15. Graceful handling of malformed AI response
  it('15. should gracefully discard malformed AI response and use deterministic analysis', async () => {
    // Malformed AI output missing required schema fields
    mockAI.queueStructuredResponse({
      randomField: 'not conforming to schema',
    } as any);

    const scamMsg = 'You won $500,000! Pay $100 processing fee to claim.';
    
    const result = await service.analyzeMessage({
      messageText: scamMsg,
      channel: 'sms',
    });

    assert.ok(result.riskScore >= 40);
    assert.strictEqual(result.scamType, 'lottery_prize_scam');
    assert.ok(result.evidence.length > 0);
  });

  // 16. Request Validation (Missing fields rejected)
  it('16. should reject invalid request missing both messageText and message fields', () => {
    const invalidBody = { channel: 'sms', language: 'en' };
    const parsed = CheckScamRequestSchema.safeParse(invalidBody);
    assert.strictEqual(parsed.success, false);
  });

  // 17. Request Validation (Oversized message > 4000 characters rejected)
  it('17. should reject oversized messages exceeding 4000 characters', () => {
    const oversizedBody = { messageText: 'a'.repeat(4001) };
    const parsed = CheckScamRequestSchema.safeParse(oversizedBody);
    assert.strictEqual(parsed.success, false);
  });

  // 18. Scan History Persistence and User Isolation
  it('18. should persist scan history when requested with userId and enforce user isolation', async () => {
    const scamRepo = repositoryFactory.getScamAnalysisRepository();
    const userA = 'user-test-a-123';
    const userB = 'user-test-b-456';

    // User A analyzes a scam message with persistHistory: true
    const resultA = await service.analyzeMessage(
      {
        messageText: 'Dear customer, update KYC or account will be suspended today.',
        channel: 'sms',
        persistHistory: true,
      },
      userA
    );

    assert.ok(resultA.riskScore > 0);

    // Retrieve history for User A
    const historyA = await scamRepo.findByUserId(userA);
    assert.strictEqual(historyA.length, 1);
    assert.strictEqual(historyA[0].userId, userA);
    assert.strictEqual(historyA[0].scamRiskScore, resultA.riskScore);

    // Retrieve history for User B (User B should see 0 records - User Isolation)
    const historyB = await scamRepo.findByUserId(userB);
    assert.strictEqual(historyB.length, 0);

    // User B attempts to delete User A's record -> should fail
    const deletedByB = await scamRepo.delete(historyA[0].id, userB);
    assert.strictEqual(deletedByB, false);

    // User A deletes their own record -> should succeed
    const deletedByA = await scamRepo.delete(historyA[0].id, userA);
    assert.strictEqual(deletedByA, true);
  });
});
