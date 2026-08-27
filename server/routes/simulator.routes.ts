import { Router } from 'express';
import { simulatorController } from '../controllers/simulator.controller';
import { validateBody } from '../middleware/validate.middleware';
import {
  CompoundInterestInputSchema,
  LoanAmortizationInputSchema,
  InflationImpactInputSchema,
  EmergencyFundInputSchema,
  Budget503020InputSchema,
} from '../models/simulator.model';

const router = Router();

router.post('/compound-interest', validateBody(CompoundInterestInputSchema), (req, res, next) =>
  simulatorController.compoundInterest(req, res, next)
);
router.post('/loan-amortization', validateBody(LoanAmortizationInputSchema), (req, res, next) =>
  simulatorController.loanAmortization(req, res, next)
);
router.post('/inflation', validateBody(InflationImpactInputSchema), (req, res, next) =>
  simulatorController.inflation(req, res, next)
);
router.post('/emergency-fund', validateBody(EmergencyFundInputSchema), (req, res, next) =>
  simulatorController.emergencyFund(req, res, next)
);
router.post('/50-30-20', validateBody(Budget503020InputSchema), (req, res, next) =>
  simulatorController.budget503020(req, res, next)
);
router.get('/presets', (req, res, next) => simulatorController.getPresets(req, res, next));

export default router;
