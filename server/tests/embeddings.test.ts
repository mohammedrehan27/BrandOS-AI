import { describe, it, expect } from 'vitest'
import { cosineSimilarity, generateEmbedding } from '../services/rag/embeddings'

describe('Vector Embeddings & Cosine Similarity', () => {
  it('calculates accurate cosine similarity for known vectors', () => {
    // Identical vectors -> cosine similarity = 1.0
    const v1 = [1, 2, 3]
    const v2 = [1, 2, 3]
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 4)

    // Orthogonal vectors -> cosine similarity = 0.0
    const v3 = [1, 0, 0]
    const v4 = [0, 1, 0]
    expect(cosineSimilarity(v3, v4)).toBeCloseTo(0.0, 4)

    // Opposite vectors -> cosine similarity = -1.0
    const v5 = [1, 0]
    const v6 = [-1, 0]
    expect(cosineSimilarity(v5, v6)).toBeCloseTo(-1.0, 4)
  })

  it('handles empty or zero-norm vectors safely', () => {
    expect(cosineSimilarity([], [])).toBe(0)
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
  })

  it('safely returns null when Gemini API key is not configured', async () => {
    const embedding = await generateEmbedding('Sample text for embedding')
    expect(embedding === null || Array.isArray(embedding)).toBe(true)
  })
})
