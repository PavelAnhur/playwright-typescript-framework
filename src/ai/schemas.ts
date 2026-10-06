import { z } from 'zod';

export const RiskSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['high', 'medium', 'low']),
});

export const TestCaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  expected: z.string().min(1),
});

export const RequirementsAnalysisSchema = z.object({
  risks: z.array(RiskSchema).min(1),
  cases: z.array(TestCaseSchema).min(1),
});

export type RequirementsAnalysis = z.infer<typeof RequirementsAnalysisSchema>;

export const FailureHypothesisSchema = z.object({
  hypothesis: z.string().min(1),
  category: z.enum(['product_bug', 'flake', 'test_issue', 'environment']),
  confidence: z.enum(['high', 'medium', 'low']),
  evidence: z.array(z.string().min(1)).min(1),
});

export type FailureHypothesis = z.infer<typeof FailureHypothesisSchema>;

export const JudgeVerdictSchema = z.object({
  score: z.number().min(0).max(10),
  verdict: z.enum(['correct', 'partially_correct', 'incorrect']),
  reasoning: z.string().min(1),
  hallucinations: z.array(z.string()).default([]),
});

export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;
