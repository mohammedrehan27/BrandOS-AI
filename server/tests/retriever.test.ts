import { describe, it, expect } from 'vitest'
import { rankGuidelinePassages } from '../services/rag/retriever'
import { DocumentSection } from '../types'

describe('RAG Keyword & Passage Retriever', () => {
  const sections: (DocumentSection & { documentName: string; documentVersion: string })[] = [
    {
      id: 'sec-1',
      documentId: 'doc-1',
      documentName: 'Clinical Marketing Guidelines',
      documentVersion: 'v2.1',
      pageNumber: 12,
      heading: 'Section 2.4: Absolute Protection Guarantees',
      ruleCount: 14,
      summary: 'Rules forbidding 100% immunity guarantees',
      extractedText:
        'RULE 3.1: Absolute immunity guarantees or claims of 100% protection against pathogens are strictly prohibited under FDA guidelines.',
      keywords: ['100%', 'immunity', 'pathogens', 'fda', 'guaranteed'],
    },
    {
      id: 'sec-2',
      documentId: 'doc-2',
      documentName: 'ESG Sustainability Standard',
      documentVersion: 'v1.2',
      pageNumber: 8,
      heading: 'Section 1.3: Carbon Neutrality Claims',
      ruleCount: 7,
      summary: 'Rules governing zero-carbon statements',
      extractedText:
        'RULE 7.2: Unqualified claims such as 100% zero-carbon or completely emission-free are prohibited without ISO-14064 certification.',
      keywords: ['zero-carbon', 'carbon', 'emission-free', 'iso-14064'],
    },
    {
      id: 'sec-3',
      documentId: 'doc-3',
      documentName: 'Product Specifications',
      documentVersion: 'v3.0',
      pageNumber: 4,
      heading: 'Section 1.2: Active Bio-Available Potency',
      ruleCount: 5,
      summary: 'Zinc bisglycinate potency specifications',
      extractedText:
        'ImmunoShield Pro delivers 15mg elemental zinc combined with 450mg European Black Elderberry standardized to 45% total polyphenols.',
      keywords: ['zinc', 'polyphenols', 'potency', 'elderberry'],
    },
  ]

  it('ranks passages highest when matching keywords and headings are present', () => {
    const claim = 'We guarantee 100% immunity against airborne pathogens within 30 minutes.'
    const ranked = rankGuidelinePassages(claim, sections, 3)

    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0].section.documentName).toBe('Clinical Marketing Guidelines')
    expect(ranked[0].section.heading).toContain('Section 2.4')
    expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(60)
    expect(ranked[0].matchedKeywords).toContain('100%')
  })

  it('correctly ranks sustainability section for carbon neutral claim', () => {
    const claim = 'Our products are 100% zero-carbon with zero emissions.'
    const ranked = rankGuidelinePassages(claim, sections, 2)

    expect(ranked[0].section.documentName).toBe('ESG Sustainability Standard')
    expect(ranked[0].section.pageNumber).toBe(8)
  })

  it('returns empty array when claim has no words or sections list is empty', () => {
    expect(rankGuidelinePassages('', sections)).toEqual([])
    expect(rankGuidelinePassages('Some claim', [])).toEqual([])
  })
})
