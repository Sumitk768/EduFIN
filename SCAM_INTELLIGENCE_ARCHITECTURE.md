# EduFIN Phase 4C: Scam Intelligence Engine — Architecture & Specification

## 1. Overview & Objective

The **EduFIN Scam Intelligence Engine** provides high-precision, explainable fraud and phishing detection for suspicious communications (SMS, email, WhatsApp, social media DMs, and job offers).

It combines a **deterministic multi-category heuristic detector** with an **LLM contextual reasoning provider (Gemini 2.5 Flash)** in a resilient hybrid architecture.

---

## 2. Core Architectural Guarantees

1. **Deterministic Floor & Uncompromising Safety:**
   - Critical deterministic indicators (such as requests for 2FA/OTP passwords, PINs, CVVs, immediate arrest threats, or phishing URLs) establish a rigid score floor ($\ge 70-85$).
   - An LLM cannot hallucinate a low-risk score for clear-cut credential harvesting attacks.

2. **100% Offline / AI-Unavailable Fallback:**
   - If the AI service times out, experiences rate limits, or returns malformed schema output, the system seamlessly falls back to the deterministic signal engine.
   - All API endpoints return a valid `ScamAnalysisResult` with categorized evidence, concrete red flags, and defensive action steps.

3. **User Isolation & Audit Trails:**
   - Authenticated users can persist scans into PostgreSQL (`scam_analyses` table via Drizzle ORM) or In-Memory repository.
   - User ownership is strictly verified on history retrieval and deletion (`requireOwnership`).

4. **Multi-Category Deterministic Signal Detection:**
   - Over 25 specialized patterns across 7 core attack vectors:
     1. **Credential Harvesting:** OTP/2FA solicitation, UPI PIN/CVV theft, fake KYC verification portals, remote desktop exfiltration tools (AnyDesk/TeamViewer).
     2. **Urgency & Coercive Threats:** Account deactivation/freezing threats, police arrest/CBI/digital arrest intimidations, electricity/utility cutoff hoaxes, 15-minute countdown timers.
     3. **Investment Fraud & Ponzi Schemes:** Guaranteed 2x/3x returns, zero-risk trading bots, daily ROI promises, pump-and-dump claims.
     4. **Predatory Loan & Advance-Fee Fraud:** Instant 0-document loans, pre-approved clearances demanding upfront processing fees.
     5. **Task & Employment Scams:** Part-time YouTube like/comment jobs, prepaid Telegram task escalation, daily work-from-home salary promises.
     6. **Social Engineering & Impersonation:** Fake lottery/sweepstakes winnings, "Hi Mom" family emergency clones, romance/pig-butchering wealth schemes.
     7. **Suspicious Domains & Link Obfuscation:** URL shorteners (bit.ly, tinyurl), high-risk TLDs (.xyz, .top, .click), raw IP links, typo-squatted bank domains.

---

## 3. Hybrid Scoring & Decision Synthesis

```
  ┌────────────────────────────────────────────────────────┐
  │                   Suspicious Message                   │
  └───────────────────────────┬────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
  ┌────────────────────────┐    ┌────────────────────────┐
  │  Deterministic Signal  │    │      Gemini AI         │
  │     Detector &         │    │  Contextual Reasoning  │
  │     Risk Scorer        │    │    (Structured JSON)   │
  └────────────┬───────────┘    └────────────┬───────────┘
               │                             │
               └──────────────┬──────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                   Decision Synthesizer                 │
  │  • Deterministic Floor: Math.max(detScore, aiScore)    │
  │  • High Risk Threshold: Score >= 70 enforces High/Crit │
  │  • Multi-Category Cross-Synergy (+15 bonus)            │
  │  • Structured Evidence Snippets + Red Flags Dedupe     │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                  ScamAnalysisResult                    │
  └────────────────────────────────────────────────────────┘
```

---

## 4. API Endpoints

- `POST /api/v1/scam-checker/analyze`:
  - Analyzes a message payload.
  - Supports both anonymous users (guest scan) and authenticated users (via `optionalAuthenticateJwt`).
  - Supports `persistHistory: true` for saving to the user's history log.
- `GET /api/v1/scam-checker/history`:
  - Retrieves the authenticated user's scan history.
- `GET /api/v1/scam-checker/history/:id`:
  - Retrieves an isolated scan record by ID for the requesting user.
- `DELETE /api/v1/scam-checker/history/:id`:
  - Deletes a specific scan record belonging to the authenticated user.
