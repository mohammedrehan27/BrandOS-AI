import { DocumentSection } from '../../types'
import { extractKeywords } from '../pdf/chunker'
import { cosineSimilarity, isValidEmbedding } from './embeddings'

export interface RankedPassage {
  section: DocumentSection & { documentName: string; documentVersion: string }
  relevanceScore: number // 0-100
  matchedKeywords: string[]
}

/**
 * Hybrid Keyword & Vector Cosine Similarity Passage Retrieval.
 * Ranks all available guideline sections against target claim text.
 */
export function rankGuidelinePassages(
  claimText: string,
  sections: (DocumentSection & { documentName: string; documentVersion: string })[],
  limit = 5,
  claimEmbedding?: number[]
): RankedPassage[] {
  const claimKeywords = extractKeywords(claimText)
  if (claimKeywords.length === 0 || sections.length === 0) return []

  const isVectorValid = claimEmbedding ? isValidEmbedding(claimEmbedding) : false

  const scored: RankedPassage[] = sections.map((sec) => {
    let score = 0
    const matchedKeywords: string[] = []
    const secTextLower = sec.extractedText.toLowerCase()
    const secHeadingLower = sec.heading.toLowerCase()

    claimKeywords.forEach((kw) => {
      // Keyword match in extracted text
      if (secTextLower.includes(kw)) {
        score += 15
        matchedKeywords.push(kw)
      }
      // Keyword match in heading (high weight)
      if (secHeadingLower.includes(kw)) {
        score += 25
      }
      // Stored pre-extracted keywords match
      if (sec.keywords?.includes(kw)) {
        score += 10
      }
    })

    // Exact multi-word phrase bonus
    const subPhrases = claimText.split(/[,.;]/).map((p) => p.trim().toLowerCase()).filter((p) => p.length > 8)
    subPhrases.forEach((phrase) => {
      if (secTextLower.includes(phrase)) {
        score += 35
      }
    })

    // Dense Vector Cosine Similarity Bonus (if embeddings are present & valid)
    if (isVectorValid && sec.embedding && isValidEmbedding(sec.embedding)) {
      const cos = cosineSimilarity(claimEmbedding!, sec.embedding)
      if (cos > 0.4) {
        score += Math.round(cos * 40)
      }
    }

    // Normalize to 0-100
    const normalizedScore = Math.min(100, Math.max(10, Math.round(score)))

    return {
      section: sec,
      relevanceScore: normalizedScore,
      matchedKeywords: Array.from(new Set(matchedKeywords)),
    }
  })

  // Sort descending by relevance score
  return scored
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)
}
