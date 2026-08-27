import { Request, Response, NextFunction } from 'express';
import { simulatorService } from '../services/simulator.service';
import { sendSuccess } from '../utils/response.util';

export class SimulatorController {
  compoundInterest(req: Request, res: Response, next: NextFunction) {
    try {
      const result = simulatorService.calculateCompound(req.body);
      return sendSuccess(res, result, 'Compound interest calculated successfully');
    } catch (err) {
      next(err);
    }
  }

  loanAmortization(req: Request, res: Response, next: NextFunction) {
    try {
      const result = simulatorService.calculateLoan(req.body);
      return sendSuccess(res, result, 'Loan amortization calculated successfully');
    } catch (err) {
      next(err);
    }
  }

  inflation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = simulatorService.calculateInflation(req.body);
      return sendSuccess(res, result, 'Inflation impact calculated successfully');
    } catch (err) {
      next(err);
    }
  }

  emergencyFund(req: Request, res: Response, next: NextFunction) {
    try {
      const result = simulatorService.calculateEmergencyFund(req.body);
      return sendSuccess(res, result, 'Emergency fund target calculated successfully');
    } catch (err) {
      next(err);
    }
  }

  budget503020(req: Request, res: Response, next: NextFunction) {
    try {
      const result = simulatorService.calculate503020(req.body);
      return sendSuccess(res, result, '50/30/20 budget calculated successfully');
    } catch (err) {
      next(err);
    }
  }

  getPresets(req: Request, res: Response, next: NextFunction) {
    try {
      const presets = simulatorService.getPresets();
      return sendSuccess(res, presets, 'Simulator presets retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export const simulatorController = new SimulatorController();
