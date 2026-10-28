import { z } from 'zod'

export const geminiClaimFindingSchema = z.object({
  claimText: z.string().describe('The exact claim extracted from marketing copy'),
  startIndex: z.number().describe('Character start index of the claim in the submitted draft'),
  endIndex: z.number().describe('Character end index of the claim in the submitted draft'),
  status: z
    .enum(['verified', 'contradicted', 'needs_verification'])
    .describe('Whether the claim is verified, contradicted, or needs verification'),
  severity: z
    .enum(['high', 'medium', 'low'])
    .describe('Compliance risk severity level'),
  brandRuleId: z.string().describe('Identified brand rule code, e.g. RULE-3.1'),
  brandRuleTitle: z.string().describe('Short title of the applicable brand rule'),
  explanation: z
    .string()
    .describe('Clear explanation of why the claim passed or breached policy'),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Algorithmic confidence rating between 0 and 100'),
  suggestedCorrection: z
    .string()
    .optional()
    .describe('Compliant alternative wording addressing the violation'),
  citedDocumentId: z.string().optional().default('doc-general'),
  citedDocumentName: z.string().optional().default('General Regulatory Policy'),
  citedPageNumber: z.number().optional().default(1),
  citedSectionHeading: z.string().optional().default('General Compliance'),
  verbatimPassage: z.string().optional().default(''),
})

export const geminiAnalysisResponseSchema = z.object({
  findings: z.array(geminiClaimFindingSchema),
})

export type GeminiAnalysisResponse = z.infer<typeof geminiAnalysisResponseSchema>
