import { describe, it, expect } from 'vitest'
import { validateFindingEvidence } from '../services/rag/evidenceValidator'
import { rankGuidelinePassages } from '../services/rag/retriever'
import { cosineSimilarity, isValidEmbedding, EXPECTED_EMBEDDING_DIM } from '../services/rag/embeddings'
import { analyzeDraftWithGemini } from '../services/gemini/provider'
import { withRetry, GeminiQuotaExceededError } from '../services/gemini/errorHandler'
import { extractPdfText } from '../services/pdf/extractor'
import { chunkPageAwareText } from '../services/pdf/chunker'
import { Finding, DocumentSection } from '../types'
import { ServiceNotConfiguredError } from '../services/errors'
import { env } from '../config/env'

describe('BrandOS RAG Architectural Audit Test Suite', () => {
  const brandAlphaSections: (DocumentSection & { documentName: string; documentVersion: string })[] = [
    {
      id: 'sec-alpha-1',
      documentId: 'doc-alpha-01',
      documentName: 'Brand Alpha Master Guidelines',
      documentVersion: 'v2.1',
      pageNumber: 3,
      heading: 'Section 4: Enterprise Service Guarantees',
      ruleCount: 3,
      summary: 'Prohibition on zero downtime guarantees',
      extractedText:
        'RULE 4.2: Zero downtime guarantees are strictly prohibited across all marketing collateral. All SLA claims must specify standard scheduled maintenance exclusions.',
      keywords: ['zero', 'downtime', 'guarantees', 'sla', 'maintenance'],
      embedding: new Array(EXPECTED_EMBEDDING_DIM).fill(0.1),
    },
    {
      id: 'sec-alpha-2',
      documentId: 'doc-alpha-01',
      documentName: 'Brand Alpha Master Guidelines',
      documentVersion: 'v2.1',
      pageNumber: 5,
      heading: 'Section 6: Sustainable Packaging Directives',
      ruleCount: 2,
      summary: 'Rules for biodegradable claims',
      extractedText:
        'RULE 6.1: Packaging may only be described as 100% recyclable if certified under ASTM D6400 standard.',
      keywords: ['packaging', '100%', 'recyclable', 'astm'],
      embedding: new Array(EXPECTED_EMBEDDING_DIM).fill(0.2),
    },
  ]

  // ============================================================================
  // 1. False Citations
  // ============================================================================
  it('downgrades findings with false/hallucinated citations to NEEDS_VERIFICATION', () => {
    const falseCitationFinding: Finding = {
      id: 'fnd-false-1',
      draftId: 'REV-AUDIT-1',
      claimText: 'zero downtime guarantees',
      startIndex: 0,
      endIndex: 24,
      status: 'contradicted',
      severity: 'high',
      brandRuleId: 'RULE-4.2',
      brandRuleTitle: 'Prohibition on Zero Downtime',
      explanation: 'Unsubstantiated promise',
      confidenceScore: 92,
      evidence: {
        documentId: 'doc-alpha-01',
        documentName: 'Brand Alpha Master Guidelines',
        documentVersion: 'v2.1',
        pageNumber: 3,
        sectionHeading: 'Section 4: Enterprise Service Guarantees',
        citationId: 'cit-false-1',
        relevanceScore: 90,
        verbatimPassage: 'This fabricated quotation does not appear in the ground truth text at all.',
      },
    }

    const result = validateFindingEvidence(falseCitationFinding, brandAlphaSections)
    expect(result.isValid).toBe(false)
    expect(result.finding.status).toBe('needs_verification')
    expect(result.reason).toContain('Verbatim passage does not match')
    expect(result.finding.explanation).toContain('Hallucinated or inaccurate quotation detected')
  })

  // ============================================================================
  // 2. Valid Quotations with Incorrect Interpretations
  // ============================================================================
  it('downgrades verified status to NEEDS_VERIFICATION when quotation contains prohibitive directives (preventing string-containment false-positives)', () => {
    // The marketing draft claims zero downtime is approved, and AI erroneously labeled it 'verified'.
    // The quotation matches the document verbatim, BUT the text says "strictly prohibited"!
    const misclassifiedFinding: Finding = {
      id: 'fnd-misinterpreted-1',
      draftId: 'REV-AUDIT-2',
      claimText: 'Zero downtime guarantees are fully supported for all enterprise clients',
      startIndex: 0,
      endIndex: 72,
      status: 'verified', // Erroneously verified by string containment
      severity: 'low',
      brandRuleId: 'RULE-4.2',
      brandRuleTitle: 'Service Guarantees',
      explanation: 'Guideline mentions zero downtime guarantees.',
      confidenceScore: 89,
      evidence: {
        documentId: 'doc-alpha-01',
        documentName: 'Brand Alpha Master Guidelines',
        documentVersion: 'v2.1',
        pageNumber: 3,
        sectionHeading: 'Section 4: Enterprise Service Guarantees',
        citationId: 'cit-mis-1',
        relevanceScore: 92,
        verbatimPassage: 'Zero downtime guarantees are strictly prohibited across all marketing collateral.',
      },
    }

    const result = validateFindingEvidence(misclassifiedFinding, brandAlphaSections)
    // Must NOT validate as verified because string containment alone is insufficient
    expect(result.isValid).toBe(false)
    expect(result.finding.status).toBe('needs_verification')
    expect(result.reason).toContain('prohibitions or restrictions')
    expect(result.finding.explanation).toContain('Potential misinterpretation')
  })

  // ============================================================================
  // 3. Wrong Guideline Versions
  // ============================================================================
  it('rejects citations referencing superceded or incorrect guideline versions', () => {
    const wrongVersionFinding: Finding = {
      id: 'fnd-ver-1',
      draftId: 'REV-AUDIT-3',
      claimText: '100% recyclable packaging',
      startIndex: 0,
      endIndex: 25,
      status: 'verified',
      severity: 'medium',
      brandRuleId: 'RULE-6.1',
      brandRuleTitle: 'Recyclable Packaging',
      explanation: 'Supported under old policy',
      confidenceScore: 85,
      evidence: {
        documentId: 'doc-alpha-01',
        documentName: 'Brand Alpha Master Guidelines',
        documentVersion: 'v1.0', // Superceded version (active is v2.1)
        pageNumber: 5,
        sectionHeading: 'Section 6: Sustainable Packaging Directives',
        citationId: 'cit-ver-1',
        relevanceScore: 85,
        verbatimPassage: 'Packaging may only be described as 100% recyclable if certified under ASTM D6400 standard.',
      },
    }

    const result = validateFindingEvidence(wrongVersionFinding, brandAlphaSections)
    expect(result.isValid).toBe(false)
    expect(result.finding.status).toBe('needs_verification')
    expect(result.reason).toContain("Guideline version mismatch: cited 'v1.0', but active guideline is 'v2.1'")
    expect(result.finding.explanation).toContain('Superceded rules must not be used')
  })

  // ============================================================================
  // 4. Cross-Brand Data Leakage
  // ============================================================================
  it('prevents cross-brand data leakage when citation references a document outside the active workspace', () => {
    const leakedDocFinding: Finding = {
      id: 'fnd-leak-1',
      draftId: 'REV-AUDIT-4',
      claimText: 'unauthorized patent assertion',
      startIndex: 0,
      endIndex: 28,
      status: 'contradicted',
      severity: 'high',
      brandRuleId: 'PAT-99',
      brandRuleTitle: 'Foreign Brand Intellectual Property',
      explanation: 'Cited from a different company guideline',
      confidenceScore: 90,
      evidence: {
        documentId: 'doc-competitor-beta-secret', // Does not exist in Brand Alpha workspace
        documentName: 'Beta Corp Secret Playbook',
        documentVersion: 'v3.0',
        pageNumber: 1,
        sectionHeading: 'Proprietary IP',
        citationId: 'cit-leak-1',
        relevanceScore: 88,
        verbatimPassage: 'Confidential formula cannot be disclosed.',
      },
    }

    const result = validateFindingEvidence(leakedDocFinding, brandAlphaSections)
    expect(result.isValid).toBe(false)
    expect(result.finding.status).toBe('needs_verification')
    expect(result.reason).toContain('was not found in active workspace guidelines')
    expect(result.finding.explanation).toContain('Possible cross-brand data leakage')
  })

  // ============================================================================
  // 5. Insufficient Retrieval Evidence
  // ============================================================================
  it('downgrades citations with low relevance scores (<60%) to NEEDS_VERIFICATION', () => {
    const lowRelevanceFinding: Finding = {
      id: 'fnd-low-1',
      draftId: 'REV-AUDIT-5',
      claimText: '100% recyclable packaging',
      startIndex: 0,
      endIndex: 25,
      status: 'contradicted',
      severity: 'medium',
      brandRuleId: 'RULE-6.1',
      brandRuleTitle: 'Recyclable Packaging',
      explanation: 'Weak evidence score',
      confidenceScore: 50,
      evidence: {
        documentId: 'doc-alpha-01',
        documentName: 'Brand Alpha Master Guidelines',
        documentVersion: 'v2.1',
        pageNumber: 5,
        sectionHeading: 'Section 6: Sustainable Packaging Directives',
        citationId: 'cit-low-1',
        relevanceScore: 42, // Insufficient (<60%)
        verbatimPassage: 'Packaging may only be described as 100% recyclable if certified under ASTM D6400 standard.',
      },
    }

    const result = validateFindingEvidence(lowRelevanceFinding, brandAlphaSections)
    expect(result.isValid).toBe(false)
    expect(result.finding.status).toBe('needs_verification')
    expect(result.reason).toContain('below minimum threshold (60%)')
  })

  // ============================================================================
  // 6. Embedding Failures and Dimension Validation
  // ============================================================================
  it('validates 768-dimension embeddings and falls back safely to keyword retrieval upon vector anomaly', () => {
    const validVector = new Array(768).fill(0.5)
    const mismatchedVector = new Array(512).fill(0.5) // Wrong dimension (512 vs 768)
    const corruptedVector = [1, NaN, Infinity]

    expect(isValidEmbedding(validVector, 768)).toBe(true)
    expect(isValidEmbedding(mismatchedVector, 768)).toBe(false)
    expect(isValidEmbedding(corruptedVector, 768)).toBe(false)

    // Cosine similarity safely returns 0 on dimensional mismatch
    expect(cosineSimilarity(validVector, mismatchedVector, 768)).toBe(0)
    expect(cosineSimilarity(validVector, corruptedVector as any, 768)).toBe(0)

    // Hybrid retriever receives corrupted/mismatched claim embedding and still returns keyword-ranked passages
    const passages = rankGuidelinePassages(
      'zero downtime guarantees for enterprise SLA',
      brandAlphaSections,
      2,
      mismatchedVector // Invalid dimension provided
    )
    expect(passages.length).toBeGreaterThan(0)
    expect(passages[0].section.documentId).toBe('doc-alpha-01')
    expect(passages[0].relevanceScore).toBeGreaterThanOrEqual(10)
  })

  // ============================================================================
  // 7. Missing API Credentials Handling
  // ============================================================================
  it('throws ServiceNotConfiguredError when Gemini API credentials are required but missing', async () => {
    const originalFallback = env.ALLOW_DEV_FALLBACK
    const originalKey = env.GEMINI_API_KEY

    try {
      // Simulate production setting where fallback is disallowed and API key is missing
      ;(env as any).ALLOW_DEV_FALLBACK = false
      ;(env as any).GEMINI_API_KEY = ''

      await expect(
        analyzeDraftWithGemini('Test draft copy', brandAlphaSections)
      ).rejects.toThrow(ServiceNotConfiguredError)
    } finally {
      ;(env as any).ALLOW_DEV_FALLBACK = originalFallback
      ;(env as any).GEMINI_API_KEY = originalKey
    }
  })

  // ============================================================================
  // 8. AI Quota Exhaustion (Rate Limiting)
  // ============================================================================
  it('detects 429 / RESOURCE_EXHAUSTED errors and raises GeminiQuotaExceededError', async () => {
    let callCount = 0
    const mockRateLimitedApi = async () => {
      callCount++
      const quotaError: any = new Error('Resource has been exhausted (e.g. check quota).')
      quotaError.status = 429
      throw quotaError
    }

    await expect(withRetry(mockRateLimitedApi, 2, 10)).rejects.toThrow(GeminiQuotaExceededError)
    // Rate limit errors should fast-fail immediately without burning useless retries
    expect(callCount).toBe(1)
  })

  // ============================================================================
  // 9. PDF Extraction Safety (Empty / Scanned Documents)
  // ============================================================================
  it('handles empty buffers and scanned PDFs safely without fabricating text or crashing', async () => {
    // 0-byte buffer
    const emptyResult = await extractPdfText(Buffer.from(''))
    expect(emptyResult.isScannedOrEmpty).toBe(true)
    expect(emptyResult.pages.length).toBe(0)
    expect(emptyResult.warning).toBeDefined()

    // Chunker safely produces empty section list for empty pages
    const emptySections = chunkPageAwareText(emptyResult.pages, 'doc-empty')
    expect(emptySections.length).toBe(0)

    // Valid mock document text
    const textBuffer = Buffer.from('Page 1 Header\nSection 1: General Brand Guidelines\nAll claims must be verified.')
    const validResult = await extractPdfText(textBuffer)
    expect(validResult.isScannedOrEmpty).toBe(false)
    expect(validResult.pages.length).toBeGreaterThan(0)
    expect(validResult.pages[0].pageNumber).toBe(1)
  })
})
