import type { FailureHypothesis } from '@ai/schemas';
import type { FlakeDetectionResult } from '@ai/tools/detectFlake';
import type { TestCase } from '@playwright/test/reporter';

export interface TriagedFailure {
  testTitle: string;
  testFile: string;
  errorMessage: string;
  hypothesis: FailureHypothesis | null;
  triageError: string | null;
  flake: FlakeDetectionResult | null;
  flakeError: string | null;
}

export interface SummaryFile {
  generatedAt: string;
  totalFailed: number;
  triaged: number;
  skipped: number;
  flakeDetectionsRun: number;
  flakeDetectionsFailed: number;
  flakeDetectionsSkipped: number;
  failures: TriagedFailure[];
}

export interface ReporterOptions {
  enableFlakeDetection?: boolean;
  maxFlakeDetections?: number;
}

export interface RawFailure {
  test: TestCase;
  result: import('@playwright/test/reporter').TestResult;
}

export interface ContextInput {
  testTitle: string;
  testFile: string;
  errorMessage: string;
  stackTrace?: string | undefined;
}
