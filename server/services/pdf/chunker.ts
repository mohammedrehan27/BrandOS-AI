import { DocumentSection } from '../../types'
import { ExtractedPage } from './extractor'
import { CONSTANTS } from '../../config/constants'

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'were', 'which',
  'about', 'into', 'than', 'will', 'then', 'they', 'their', 'there', 'what',
  'when', 'where', 'also', 'some', 'other', 'been', 'must', 'should', 'would',
  'all', 'are', 'not', 'can', 'our', 'you', 'your', 'has', 'had',
])

export function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9%\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))

  const freqMap: Record<string, number> = {}
  words.forEach((w) => {
    freqMap[w] = (freqMap[w] || 0) + 1
  })

  // Return top 15 most frequent domain keywords
  return Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w)
}

export function chunkPageAwareText(
  pages: ExtractedPage[],
  documentId?: string
): DocumentSection[] {
  const sections: DocumentSection[] = []

  pages.forEach((page) => {
    const lines = page.text.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) return

    let currentHeading = `Page ${page.pageNumber}: General Standards`
    let currentParagraphs: string[] = []
    let sectionIdx = 1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Detect prominent headings (e.g. "Section 2.4", "Rule 3.1", "Chapter 1", or UPPERCASE line)
      const isHeading =
        /^(?:Section|Chapter|Rule|Article|Part)\s+[0-9A-Z.:-]+/i.test(line) ||
        (/^[A-Z0-9\s:.,-]{5,60}$/.test(line) && line.length < 50 && !line.endsWith('.'))

      if (isHeading && currentParagraphs.length > 0) {
        const fullSectionText = currentParagraphs.join(' ')
        const keywords = extractKeywords(fullSectionText)
        const ruleCount = Math.max(1, (fullSectionText.match(/\b(?:must|shall|prohibited|required|forbidden|mandatory)\b/gi) || []).length)

        sections.push({
          id: `sec-${documentId || 'doc'}-p${page.pageNumber}-${sectionIdx++}`,
          documentId,
          pageNumber: page.pageNumber,
          heading: currentHeading,
          ruleCount,
          summary: fullSectionText.slice(0, 140) + '...',
          extractedText: fullSectionText,
          keywords,
        })

        currentHeading = line
        currentParagraphs = []
      } else if (isHeading) {
        currentHeading = line
      } else {
        currentParagraphs.push(line)
      }
    }

    if (currentParagraphs.length > 0) {
      const fullSectionText = currentParagraphs.join(' ')
      const keywords = extractKeywords(fullSectionText)
      const ruleCount = Math.max(1, (fullSectionText.match(/\b(?:must|shall|prohibited|required|forbidden|mandatory)\b/gi) || []).length)

      sections.push({
        id: `sec-${documentId || 'doc'}-p${page.pageNumber}-${sectionIdx++}`,
        documentId,
        pageNumber: page.pageNumber,
        heading: currentHeading,
        ruleCount,
        summary: fullSectionText.slice(0, 140) + '...',
        extractedText: fullSectionText,
        keywords,
      })
    }
  })

  // If no sections formed, create a baseline section only if non-empty text exists
  if (sections.length === 0 && pages.length > 0) {
    const fullText = pages.map((p) => p.text).join('\n').trim()
    if (fullText.length > 0) {
      sections.push({
        id: `sec-${documentId || 'doc'}-1`,
        documentId,
        pageNumber: pages[0]?.pageNumber || 1,
        heading: 'General Guideline Standards',
        ruleCount: 1,
        summary: fullText.slice(0, 140) + '...',
        extractedText: fullText,
        keywords: extractKeywords(fullText),
      })
    }
  }

  return sections
}
