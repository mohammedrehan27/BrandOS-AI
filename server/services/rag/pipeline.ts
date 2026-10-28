import { BrandDocument, DocumentSection, Finding, FindingSeverity, FindingStatus } from '../../types'
import { rankGuidelinePassages } from './retriever'
import { validateFindingEvidence } from './evidenceValidator'
import { analyzeDraftWithGemini } from '../gemini/provider'
import { generateEmbedding } from './embeddings'
import { CONSTANTS } from '../../config/constants'

export interface RagPipelineResult {
  findings: Finding[]
  stats: {
    totalClaims: number
    verified: number
    contradicted: number
    needsVerification: number
    highSeverityCount: number
  }
  executionMode: 'gemini_live_ai' | 'offline_deterministic_fallback'
}

type SectionWithDoc = DocumentSection & { documentName: string; documentVersion: string }

/**
 * Orchestrates guideline retrieval, AI evaluation with Gemini (or deterministic fallback),
 * strict passage evidence verification, and stats generation.
 */
export async function executeRagAnalysis(
  draftId: string,
  draftText: string,
  guidelineDocuments: BrandDocument[]
): Promise<RagPipelineResult> {
  // 1. Flatten all document sections with document context
  const allSections: SectionWithDoc[] = []
  for (const doc of guidelineDocuments) {
    if (doc.status === 'active' && doc.sections) {
      for (const sec of doc.sections) {
        allSections.push({
          ...sec,
          documentId: doc.id,
          documentName: doc.name,
          documentVersion: doc.version,
        })
      }
    }
  }

  if (allSections.length === 0) {
    return {
      findings: [],
      stats: {
        totalClaims: 0,
        verified: 0,
        contradicted: 0,
        needsVerification: 0,
        highSeverityCount: 0,
      },
      executionMode: 'offline_deterministic_fallback',
    }
  }

  // 2. Compute semantic embedding for hybrid retrieval if Gemini is configured
  const draftEmbedding = await generateEmbedding(draftText)

  // 3. Retrieve top-ranked guideline passages relevant to the overall draft (hybrid dense + sparse)
  const rankedPassages = rankGuidelinePassages(draftText, allSections, 15, draftEmbedding || undefined)
  const candidateSections = rankedPassages.map((rp) => rp.section)

  let rawFindings: Finding[] = []
  let executionMode: 'gemini_live_ai' | 'offline_deterministic_fallback' = 'offline_deterministic_fallback'

  // 3. Try Gemini AI Provider first
  const geminiResult = await analyzeDraftWithGemini(draftText, candidateSections)

  if (geminiResult && geminiResult.findings && geminiResult.findings.length > 0) {
    executionMode = 'gemini_live_ai'
    // Map Gemini structured findings to BrandOS Finding model
    rawFindings = geminiResult.findings.map((f, idx) => {
      // Find matching passage to attach citation metadata
      const matchedPassage = rankedPassages.find(
        (rp) =>
          rp.section.documentName.toLowerCase().includes((f.citedDocumentName || '').toLowerCase()) ||
          (f.citedDocumentName || '').toLowerCase().includes(rp.section.documentName.toLowerCase())
      ) || rankedPassages[0]

      const evidence = {
        documentId: f.citedDocumentId || matchedPassage.section.documentId || 'doc-ref',
        documentName: f.citedDocumentName || matchedPassage.section.documentName,
        documentVersion: matchedPassage.section.documentVersion || 'v1.0',
        pageNumber: f.citedPageNumber || matchedPassage.section.pageNumber,
        sectionHeading: f.citedSectionHeading || matchedPassage.section.heading,
        verbatimPassage: f.verbatimPassage || matchedPassage.section.extractedText.slice(0, 200),
        citationId: `cit-${draftId}-${idx + 1}`,
        relevanceScore: matchedPassage.relevanceScore,
      }

      return {
        id: `fnd-${Date.now()}-${idx + 1}`,
        draftId,
        claimText: f.claimText,
        startIndex: Math.max(0, f.startIndex),
        endIndex: Math.min(draftText.length, f.endIndex > f.startIndex ? f.endIndex : f.startIndex + f.claimText.length),
        status: f.status as FindingStatus,
        severity: f.severity as FindingSeverity,
        brandRuleId: f.brandRuleId || `RULE-${idx + 1}`,
        brandRuleTitle: f.brandRuleTitle || 'Brand Guideline Rule',
        explanation: f.explanation,
        confidenceScore: f.confidenceScore,
        suggestedCorrection: f.suggestedCorrection,
        suggestionStatus: f.suggestedCorrection ? 'unapplied' : undefined,
        evidence,
      }
    })
  } else {
    // 4. Deterministic Dev-Fallback Analyzer: Rule matching based on retrieved guideline passages
    executionMode = 'offline_deterministic_fallback'
    rawFindings = generateDeterministicFindings(draftId, draftText, allSections, rankedPassages)
  }

  // 5. Enforce Evidence Grounding: Every candidate finding must pass evidence validation
  const validatedFindings: Finding[] = rawFindings.map((finding) => {
    const valResult = validateFindingEvidence(finding, allSections)
    return valResult.finding
  })

  // 6. Compute stats
  const totalClaims = validatedFindings.length
  const verified = validatedFindings.filter((f) => f.status === 'verified').length
  const contradicted = validatedFindings.filter((f) => f.status === 'contradicted').length
  const needsVerification = validatedFindings.filter((f) => f.status === 'needs_verification').length
  const highSeverityCount = validatedFindings.filter((f) => f.severity === 'high').length

  return {
    findings: validatedFindings,
    stats: {
      totalClaims,
      verified,
      contradicted,
      needsVerification,
      highSeverityCount,
    },
    executionMode,
  }
}

/**
 * Deterministic rule-based claim extractor for development fallback when external Gemini API is not configured.
 * Extracts claims, matches against guideline sections, and produces authentic citations.
 */
function generateDeterministicFindings(
  draftId: string,
  draftText: string,
  allSections: SectionWithDoc[],
  rankedPassages: ReturnType<typeof rankGuidelinePassages>
): Finding[] {
  const findings: Finding[] = []
  let findingCount = 0

  // Regex patterns targeting claims: absolute statements, clinical promises, environmental assertions
  const patterns: {
    regex: RegExp
    status: FindingStatus
    severity: FindingSeverity
    ruleTitle: string
    ruleId: string
    explanation: string
    suggestCorrection: (match: string) => string
  }[] = [
    {
      regex: /(?:guaranteed\s+)?100%\s*(?:immunity|protection|satisfaction|guaranteed|natural|safe|effective|clean)?|guaranteed\s+(?:100%|immunity|protection)|completely\s*(?:safe|free|eliminated)/gi,
      status: 'contradicted',
      severity: 'high',
      ruleTitle: 'Prohibition on Unsubstantiated Absolute Claims',
      ruleId: 'REG-104',
      explanation: 'Absolute claims such as "100%" or "guaranteed immunity" violate FTC advertising standards unless certified by double-blind testing.',
      suggestCorrection: (_m) => `demonstrably high-performance and extensively tested`,
    },
    {
      regex: /(?:clinically\s*proven\s*(?:to|results|formula)?|dermatologist\s*approved|cures(?:\s+[a-z]+)?|heals(?:\s+[a-z]+)?)/gi,
      status: 'contradicted',
      severity: 'high',
      ruleTitle: 'Clinical and Efficacy Substantiation Standard',
      ruleId: 'CLN-02',
      explanation: 'Claims of clinical efficacy require explicit citation of institutional clinical study ID and methodology.',
      suggestCorrection: (_m) => `demonstrated in consumer perception evaluations`,
    },
    {
      regex: /(zero\s*carbon|100%\s*carbon\s*neutral|net\s*zero\s*(?:footprint)?|eco-friendly\s*(?:certified)?)/gi,
      status: 'needs_verification',
      severity: 'medium',
      ruleTitle: 'ESG Environmental Substantiation Mandate',
      ruleId: 'ESG-08',
      explanation: 'Environmental impact assertions require active ISO 14064 or third-party carbon audit certificate.',
      suggestCorrection: (_m) => `designed to minimize environmental impact with documented carbon offset projects`,
    },
    {
      regex: /(revolutionary|unmatched\s*in\s*the\s*industry|the\s*world's\s*first|guaranteed\s*roi)/gi,
      status: 'contradicted',
      severity: 'medium',
      ruleTitle: 'Brand Voice and Modesty Standard',
      ruleId: 'TONE-05',
      explanation: 'Superlatives and unquantified comparisons contradict our authentic, science-forward brand identity.',
      suggestCorrection: (_m) => `innovative and purpose-engineered`,
    },
  ]

  for (const p of patterns) {
    let match: RegExpExecArray | null
    // Reset regex state
    p.regex.lastIndex = 0
    while ((match = p.regex.exec(draftText)) !== null) {
      findingCount++
      const claimText = match[0]
      const startIndex = match.index
      const endIndex = startIndex + claimText.length

      // Retrieve best matching guideline section for this specific claim
      const passageResults = rankGuidelinePassages(claimText, allSections, 1)
      const bestPassage = passageResults[0] || rankedPassages[0]

      const evidence = {
        documentId: bestPassage?.section.documentId || 'doc-ref',
        documentName: bestPassage?.section.documentName || 'Core Brand Guidelines',
        documentVersion: bestPassage?.section.documentVersion || 'v1.0',
        pageNumber: bestPassage?.section.pageNumber || 1,
        sectionHeading: bestPassage?.section.heading || p.ruleTitle,
        verbatimPassage: bestPassage?.section.extractedText
          ? bestPassage.section.extractedText.slice(0, 240)
          : 'Claims must be substantiated with verified empirical documentation.',
        citationId: `cit-${draftId}-${findingCount}`,
        relevanceScore: Math.max(75, bestPassage?.relevanceScore || 75),
      }

      findings.push({
        id: `fnd-${Date.now()}-${findingCount}`,
        draftId,
        claimText,
        startIndex,
        endIndex,
        status: p.status,
        severity: p.severity,
        brandRuleId: p.ruleId,
        brandRuleTitle: p.ruleTitle,
        explanation: `${p.explanation} [Offline Fallback Mode: Evaluated via deterministic rules; Gemini AI was not invoked.]`,
        confidenceScore: 88,
        suggestedCorrection: p.suggestCorrection(claimText),
        suggestionStatus: 'unapplied',
        evidence,
      })
    }
  }

  // If draft has general statements and no violations triggered, add a positive verified finding if passages align
  if (findings.length === 0 && rankedPassages.length > 0 && draftText.trim().length > 20) {
    const firstSentence = draftText.split(/[.!?]/)[0].trim()
    const bestPassage = rankedPassages[0]
    findings.push({
      id: `fnd-${Date.now()}-1`,
      draftId,
      claimText: firstSentence.slice(0, 80),
      startIndex: 0,
      endIndex: firstSentence.slice(0, 80).length,
      status: 'verified',
      severity: 'low',
      brandRuleId: 'CORE-01',
      brandRuleTitle: 'Brand Consistency Standard',
      explanation: 'Content is aligned with approved terminology and core brand guidelines. [Offline Fallback Mode: Evaluated via deterministic rules; Gemini AI was not invoked.]',
      confidenceScore: 92,
      evidence: {
        documentId: bestPassage.section.documentId || 'doc-1',
        documentName: bestPassage.section.documentName,
        documentVersion: bestPassage.section.documentVersion,
        pageNumber: bestPassage.section.pageNumber,
        sectionHeading: bestPassage.section.heading,
        verbatimPassage: bestPassage.section.extractedText.slice(0, 200),
        citationId: `cit-${draftId}-1`,
        relevanceScore: Math.max(80, bestPassage.relevanceScore),
      },
    })
  }

  return findings
}
