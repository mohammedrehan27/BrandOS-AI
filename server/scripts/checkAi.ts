import dotenv from 'dotenv'
dotenv.config()

import { GoogleGenAI } from '@google/genai'
import { env, getServiceConfigStatus } from '../config/env'
import { generateEmbedding } from '../services/rag/embeddings'
import { analyzeDraftWithGemini } from '../services/gemini/provider'
import { DocumentSection } from '../types'

async function runAiDiagnostics() {
  console.log('\n======================================================')
  console.log('       🔍 BrandOS AI - Gemini Diagnostic Checker      ')
  console.log('======================================================\n')

  const status = getServiceConfigStatus()

  // 1. Environment & Configuration Check
  console.log('📋 Step 1: Inspecting Environment Configuration...')
  console.log(` - GEMINI_API_KEY: ${env.GEMINI_API_KEY ? '✅ Set (' + env.GEMINI_API_KEY.slice(0, 8) + '...)' : '❌ Not set'}`)
  console.log(` - GEMINI_MODEL:   ${env.GEMINI_MODEL}`)
  console.log(` - DEV_FALLBACK:   ${env.ALLOW_DEV_FALLBACK ? 'Enabled (Deterministic offline mock)' : 'Disabled (Strict external API)'}`)
  console.log(` - Config Status:  ${status.gemini.configured ? '✅ Configured' : '⚠️ Missing variables: ' + status.gemini.missingVars.join(', ')}`)

  if (!env.GEMINI_API_KEY) {
    console.log('\n❌ [FAILED] Cannot run live Gemini checks: GEMINI_API_KEY is not defined in .env.')
    console.log('👉 Please set GEMINI_API_KEY in your .env file to enable live AI.\n')
    process.exit(1)
  }

  // 2. Direct Gemini API Ping
  console.log('\n📡 Step 2: Testing Direct Gemini API Ping (Basic Completion)...')
  const startTime = Date.now()
  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
    const pingResponse = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: 'Respond with exactly: {"status":"active","message":"Gemini is operational"} in JSON.',
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    })
    const pingLatency = Date.now() - startTime
    console.log(` - Latency:     ${pingLatency}ms`)
    console.log(` - Raw Output:  ${pingResponse.text?.trim()}`)
    console.log(' - Direct Ping: ✅ SUCCESS')
  } catch (err: any) {
    console.error(' - Direct Ping: ❌ FAILED')
    console.error(`   Error: ${err.message || err}`)
  }

  // 3. Text Embedding Test
  console.log('\n🧬 Step 3: Testing Gemini Vector Embeddings (gemini-embedding-001)...')
  const embedStart = Date.now()
  try {
    const embedding = await generateEmbedding('Enterprise Brand Governance and Regulatory Compliance Guidelines')
    const embedLatency = Date.now() - embedStart
    if (embedding && embedding.length > 0) {
      console.log(` - Latency:       ${embedLatency}ms`)
      console.log(` - Dimensions:    ${embedding.length} values`)
      console.log(` - Sample Vector: [${embedding.slice(0, 3).map((v) => v.toFixed(4)).join(', ')}, ...]`)
      console.log(' - Embeddings:    ✅ SUCCESS')
    } else {
      console.log(' - Embeddings:    ⚠️ Null response (Dev fallback or model unavailable)')
    }
  } catch (err: any) {
    console.error(' - Embeddings:    ❌ FAILED')
    console.error(`   Error: ${err.message || err}`)
  }

  // 4. End-to-End Compliance Review Prompt Test
  console.log('\n🧠 Step 4: Testing Full Compliance Evaluation (RAG + Prompt Analysis)...')
  const sampleGuideline: DocumentSection & { documentName: string; documentVersion: string } = {
    id: 'sec-diag-1',
    documentId: 'doc-diag-1',
    documentName: 'Enterprise Cloud SLA Policy',
    documentVersion: 'v3.0',
    pageNumber: 2,
    heading: 'High Availability Mandates',
    ruleCount: 1,
    summary: 'Rules on uptime and scheduled maintenance',
    extractedText: 'RULE 3.1: Zero downtime or 100% uptime claims are strictly prohibited. All SLA guarantees must state maintenance windows.',
    keywords: ['zero', 'downtime', 'uptime', 'sla'],
  }

  const sampleDraft = 'Our next-generation enterprise platform guarantees 100% zero downtime for all mission-critical cloud deployments.'

  const reviewStart = Date.now()
  try {
    const reviewResult = await analyzeDraftWithGemini(sampleDraft, [sampleGuideline])
    const reviewLatency = Date.now() - reviewStart
    console.log(` - Latency:       ${reviewLatency}ms`)
    if (reviewResult && reviewResult.findings) {
      console.log(` - Findings Found: ${reviewResult.findings.length}`)
      reviewResult.findings.forEach((f, i) => {
        console.log(`   [Finding ${i + 1}] Status: ${f.status.toUpperCase()} | Severity: ${f.severity} | Rule: ${f.brandRuleId}`)
        console.log(`     Claim: "${f.claimText}"`)
        console.log(`     Fix:   "${f.suggestedCorrection || 'N/A'}"`)
      })
      console.log(' - RAG Analysis:  ✅ SUCCESS')
    } else {
      console.log(' - RAG Analysis:  ⚠️ Returned null (Fallback triggered)')
    }
  } catch (err: any) {
    console.error(' - RAG Analysis:  ❌ FAILED')
    console.error(`   Error: ${err.message || err}`)
  }

  console.log('\n======================================================')
  console.log('               🎉 Diagnostic Complete                 ')
  console.log('======================================================\n')
}

runAiDiagnostics().catch((err) => {
  console.error('\nFatal Diagnostic Error:', err)
  process.exit(1)
})
