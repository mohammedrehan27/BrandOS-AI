import { GoogleGenAI } from '@google/genai'
import { env, getServiceConfigStatus } from '../../config/env'

let geminiClient: GoogleGenAI | null = null

function getGeminiClient(): GoogleGenAI | null {
  if (!env.GEMINI_API_KEY) return null
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  }
  return geminiClient
}

/**
 * Generates 768-dimensional vector embedding for text using Google Gemini text-embedding-004.
 * Returns null if Gemini API key is not configured or in dev fallback mode.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const status = getServiceConfigStatus()
  if (!status.gemini.configured || !env.GEMINI_API_KEY) {
    return null
  }

  const ai = getGeminiClient()
  if (!ai) return null

  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text.slice(0, 2048),
    })

    const values = response.embeddings?.[0]?.values || (response as any).embedding?.values
    return values && values.length > 0 ? values : null
  } catch (err: any) {
    console.warn('[BrandOS Embedding Warning]:', err.message)
    return null
  }
}

export const EXPECTED_EMBEDDING_DIM = 768

/**
 * Validates whether an array is a valid vector of finite numbers, optionally matching expectedDim.
 */
export function isValidEmbedding(vec: unknown, expectedDim?: number): vec is number[] {
  if (!Array.isArray(vec) || vec.length === 0) return false
  if (expectedDim !== undefined && vec.length !== expectedDim) return false
  return vec.every((n) => typeof n === 'number' && Number.isFinite(n))
}

/**
 * Computes cosine similarity between two embedding vectors.
 * Returns a score between -1 and 1.
 * Validates vector integrity and dimensional equality strictly.
 */
export function cosineSimilarity(a: number[], b: number[], expectedDim?: number): number {
  if (!isValidEmbedding(a, expectedDim) || !isValidEmbedding(b, expectedDim) || a.length !== b.length) {
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
