import { describe, it, expect } from 'vitest'
import { extractKeywords, chunkPageAwareText } from '../services/pdf/chunker'
import { ExtractedPage } from '../services/pdf/extractor'

describe('PDF Text Chunker & Keyword Extraction', () => {
  it('extracts domain keywords while filtering common stop words', () => {
    const sample =
      'All clinical claims must be substantiated by double-blind randomized trials. Unsubstantiated immunity claims are strictly prohibited.'
    const keywords = extractKeywords(sample)

    expect(keywords).toContain('clinical')
    expect(keywords).toContain('claims')
    expect(keywords).toContain('substantiated')
    expect(keywords).toContain('prohibited')
    expect(keywords).not.toContain('all')
    expect(keywords).not.toContain('the')
    expect(keywords).not.toContain('are')
  })

  it('chunks pages into sections while detecting headings and counting rule mandates', () => {
    const pages: ExtractedPage[] = [
      {
        pageNumber: 1,
        text: `Section 1.1: Efficacy Guardrails
Marketing copy must clearly state active ingredient potencies.
Claims shall not promise 100% cure under any circumstances.
Section 1.2: Brand Tone Standards
We are a science-forward brand. Avoid excessive hyperbole.`,
      },
    ]

    const sections = chunkPageAwareText(pages, 'doc-test-1')

    expect(sections.length).toBeGreaterThanOrEqual(2)
    expect(sections[0].heading).toContain('Section 1.1')
    expect(sections[0].pageNumber).toBe(1)
    expect(sections[0].ruleCount).toBeGreaterThanOrEqual(2) // 'must' and 'shall'
    expect(sections[1].heading).toContain('Section 1.2')
  })

  it('handles empty page gracefully and creates a default section if text exists', () => {
    const emptySections = chunkPageAwareText([])
    expect(emptySections).toEqual([])

    const plainPages: ExtractedPage[] = [{ pageNumber: 1, text: 'Single line of text without any section headers.' }]
    const fallbackSections = chunkPageAwareText(plainPages, 'doc-fallback')
    expect(fallbackSections.length).toBe(1)
    expect(fallbackSections[0].heading).toBe('Page 1: General Standards')
  })
})
