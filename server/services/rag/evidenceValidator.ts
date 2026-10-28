import { Finding, DocumentSection } from '../../types'
import { CONSTANTS } from '../../config/constants'

export interface EvidenceValidationResult {
  isValid: boolean
  finding: Finding
  reason?: string
}

const PROHIBITIVE_DIRECTIVE_REGEX =
  /\b(?:strictly prohibited|prohibited|shall not|must not|never|unauthorized|forbidden|not permitted|disallowed|cannot claim|do not claim)\b/i

/**
 * Validates that every citation strictly references genuine, retrieved guideline passages.
 * Verifies document ownership, guideline version, passage identity, exact quotation provenance,
 * and semantic evidence relevance.
 *
 * It does NOT treat string containment alone as proof that a claim is supported.
 * Flips ungrounded, mismatched, contradictory, or weak citations to 'needs_verification'.
 */
export function validateFindingEvidence(
  finding: Finding,
  availableSections: (DocumentSection & { documentName: string; documentVersion: string })[]
): EvidenceValidationResult {
  const evidence = finding.evidence
  if (!evidence || !evidence.verbatimPassage || !evidence.documentId) {
    return {
      isValid: false,
      reason: 'Finding lacks mandatory citation evidence.',
      finding: {
        ...finding,
        status: 'needs_verification',
        explanation: `${finding.explanation} [Evidence Validation: Missing verbatim passage or document citation. Human verification required.]`,
        confidenceScore: Math.min(finding.confidenceScore, 50),
      },
    }
  }

  // 1. Cross-brand isolation & document ownership: Match against available workspace sections
  const matchedSection = availableSections.find(
    (s) => s.documentId === evidence.documentId && s.pageNumber === evidence.pageNumber
  ) || availableSections.find((s) => s.documentId === evidence.documentId)

  if (!matchedSection) {
    return {
      isValid: false,
      reason: `Referenced document (${evidence.documentName || evidence.documentId}) was not found in active workspace guidelines.`,
      finding: {
        ...finding,
        status: 'needs_verification',
        explanation: `${finding.explanation} [Evidence Validation: Cited document does not exist in active workspace guidelines. Possible cross-brand data leakage or invalid ID. Human review required.]`,
        confidenceScore: Math.min(finding.confidenceScore, 30),
      },
    }
  }

  // 2. Guideline version verification
  if (
    evidence.documentVersion &&
    matchedSection.documentVersion &&
    evidence.documentVersion !== matchedSection.documentVersion
  ) {
    return {
      isValid: false,
      reason: `Guideline version mismatch: cited '${evidence.documentVersion}', but active guideline is '${matchedSection.documentVersion}'.`,
      finding: {
        ...finding,
        status: 'needs_verification',
        explanation: `${finding.explanation} [Evidence Validation: Guideline version mismatch. Citation references ${evidence.documentVersion}, but active version is ${matchedSection.documentVersion}. Superceded rules must not be used.]`,
        confidenceScore: Math.min(finding.confidenceScore, 40),
      },
    }
  }

  // 3. Exact quotation provenance & passage authenticity
  const normVerbatim = evidence.verbatimPassage.toLowerCase().replace(/\s+/g, ' ').trim()
  const normExtracted = matchedSection.extractedText.toLowerCase().replace(/\s+/g, ' ')

  // Check authentic containment: verbatim passage must be genuinely present in extracted text
  const passageExists = normExtracted.includes(normVerbatim)

  if (!passageExists) {
    return {
      isValid: false,
      reason: 'Verbatim passage does not match active ground-truth text.',
      finding: {
        ...finding,
        status: 'needs_verification',
        explanation: `${finding.explanation} [Evidence Validation: Cited verbatim passage was not found in authentic guideline text. Hallucinated or inaccurate quotation detected.]`,
        confidenceScore: Math.min(finding.confidenceScore, 40),
      },
    }
  }

  // 4. Evidence relevance threshold check
  const scoreSufficient = evidence.relevanceScore >= CONSTANTS.MIN_CLAIM_EVIDENCE_RELEVANCE
  if (!scoreSufficient) {
    return {
      isValid: false,
      reason: `Citation relevance score (${evidence.relevanceScore}%) is below minimum threshold (${CONSTANTS.MIN_CLAIM_EVIDENCE_RELEVANCE}%).`,
      finding: {
        ...finding,
        status: 'needs_verification',
        explanation: `${finding.explanation} [Evidence Validation: Ground-truth guideline evidence is insufficient (${evidence.relevanceScore}% relevance). Human reviewer verification required before publication.]`,
        confidenceScore: Math.min(finding.confidenceScore, 50),
      },
    }
  }

  // 5. Semantic Polarity & Contradiction Check:
  // String containment alone must not treat a claim as supported if the cited guideline passage
  // actually prohibits or strictly restricts the claim.
  if (finding.status === 'verified') {
    const passageHasProhibitions = PROHIBITIVE_DIRECTIVE_REGEX.test(evidence.verbatimPassage) ||
      PROHIBITIVE_DIRECTIVE_REGEX.test(matchedSection.extractedText)

    if (passageHasProhibitions) {
      return {
        isValid: false,
        reason: 'Valid quotation contains mandatory prohibitions or restrictions; claim cannot be verified based on string containment alone.',
        finding: {
          ...finding,
          status: 'needs_verification',
          explanation: `${finding.explanation} [Evidence Validation: Potential misinterpretation. The cited passage contains explicit restrictive/prohibitive directives. Substring presence does not substantiate compliance; downgraded to needs_verification.]`,
          confidenceScore: Math.min(finding.confidenceScore, 55),
        },
      }
    }
  }

  return {
    isValid: true,
    finding,
  }
}
