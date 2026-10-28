import { describe, it, expect } from 'vitest'
import { validateFindingEvidence } from '../services/rag/evidenceValidator'
import { Finding, DocumentSection } from '../types'

describe('Strict Evidence Citation Validator', () => {
  const sections: (DocumentSection & { documentName: string; documentVersion: string })[] = [
    {
      id: 'sec-1',
      documentId: 'doc-1',
      documentName: 'Acme Clinical Marketing Guidelines',
      documentVersion: 'v2.1',
      pageNumber: 12,
      heading: 'Section 2.4: Efficacy Limitations',
      ruleCount: 5,
      summary: 'Prohibition on absolute immunity claims',
      extractedText:
        'RULE 3.1: Absolute immunity guarantees or claims of 100% protection against pathogens are strictly prohibited under FDA 21 CFR §101.93.',
      keywords: ['immunity', '100%'],
    },
  ]

  it('validates authentic citations referencing real verbatim guideline text', () => {
    const validFinding: Finding = {
      id: 'fnd-1',
      draftId: 'REV-1',
      claimText: 'guaranteed 100% immunity',
      startIndex: 0,
      endIndex: 24,
      status: 'contradicted',
      severity: 'high',
      brandRuleId: 'RULE-3.1',
      brandRuleTitle: 'Prohibition on Absolute Protection',
      explanation: 'Absolute claims violate Section 2.4',
      confidenceScore: 95,
      evidence: {
        documentId: 'doc-1',
        documentName: 'Acme Clinical Marketing Guidelines',
        documentVersion: 'v2.1',
        pageNumber: 12,
        sectionHeading: 'Section 2.4: Efficacy Limitations',
        citationId: 'cit-1',
        relevanceScore: 95,
        verbatimPassage: 'RULE 3.1: Absolute immunity guarantees or claims of 100% protection',
      },
    }

    const result = validateFindingEvidence(validFinding, sections)
    expect(result.isValid).toBe(true)
    expect(result.finding.status).toBe('contradicted')
  })

  it('flips finding to needs_verification when verbatim passage is fabricated or missing', () => {
    const hallucinatedFinding: Finding = {
      id: 'fnd-2',
      draftId: 'REV-1',
      claimText: 'dermatologist approved',
      startIndex: 0,
      endIndex: 22,
      status: 'contradicted',
      severity: 'high',
      brandRuleId: 'RULE-9.9',
      brandRuleTitle: 'Fabricated Rule',
      explanation: 'Made up claim',
      confidenceScore: 90,
      evidence: {
        documentId: 'doc-1',
        documentName: 'Acme Clinical Marketing Guidelines',
        documentVersion: 'v2.1',
        pageNumber: 12,
        sectionHeading: 'Section 2.4: Efficacy Limitations',
        citationId: 'cit-2',
        relevanceScore: 90,
        verbatimPassage: 'This text does not exist anywhere in the extracted document guidelines.',
      },
    }

    const result = validateFindingEvidence(hallucinatedFinding, sections)
    expect(result.isValid).toBe(false)
    expect(result.finding.status).toBe('needs_verification')
    expect(result.finding.explanation).toContain('[Evidence Validation:')
  })

  it('flips finding to needs_verification when document ID does not exist in guidelines', () => {
    const missingDocFinding: Finding = {
      id: 'fnd-3',
      draftId: 'REV-1',
      claimText: 'some claim',
      startIndex: 0,
      endIndex: 10,
      status: 'verified',
      severity: 'low',
      brandRuleId: 'RULE-1',
      brandRuleTitle: 'Rule',
      explanation: 'Explanation',
      confidenceScore: 80,
      evidence: {
        documentId: 'doc-nonexistent',
        documentName: 'Non Existent Document',
        documentVersion: 'v1.0',
        pageNumber: 1,
        sectionHeading: 'Header',
        citationId: 'cit-3',
        relevanceScore: 80,
        verbatimPassage: 'Some passage',
      },
    }

    const result = validateFindingEvidence(missingDocFinding, sections)
    expect(result.isValid).toBe(false)
    expect(result.finding.status).toBe('needs_verification')
  })

  it('flips finding to needs_verification when citation relevance score is below 60%', () => {
    const lowRelevanceFinding: Finding = {
      id: 'fnd-4',
      draftId: 'REV-1',
      claimText: 'guaranteed 100% immunity',
      startIndex: 0,
      endIndex: 24,
      status: 'contradicted',
      severity: 'high',
      brandRuleId: 'RULE-3.1',
      brandRuleTitle: 'Rule',
      explanation: 'Explanation',
      confidenceScore: 95,
      evidence: {
        documentId: 'doc-1',
        documentName: 'Acme Clinical Marketing Guidelines',
        documentVersion: 'v2.1',
        pageNumber: 12,
        sectionHeading: 'Section 2.4: Efficacy Limitations',
        citationId: 'cit-4',
        relevanceScore: 40, // Below 60% threshold
        verbatimPassage: 'RULE 3.1: Absolute immunity guarantees',
      },
    }

    const result = validateFindingEvidence(lowRelevanceFinding, sections)
    expect(result.isValid).toBe(false)
    expect(result.finding.status).toBe('needs_verification')
  })
})
