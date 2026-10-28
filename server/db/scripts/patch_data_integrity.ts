/**
 * BrandOS AI — Data Integrity Patch Script
 *
 * Reconciles missing findings and stats across review drafts REV-2025-074,
 * REV-2025-061, and REV-2025-048, providing full evidence citations,
 * verbatim passages, and exact character offsets.
 *
 * Usage:
 *   npx tsx server/db/scripts/patch_data_integrity.ts --dry-run
 *   npx tsx server/db/scripts/patch_data_integrity.ts --apply
 */

import { Finding } from '../../types'
import { getSupabaseClient } from '../supabase'

export const PATCHED_FINDINGS_BY_DRAFT: Record<string, Finding[]> = {
  'REV-2025-074': [
    {
      id: 'fnd-74-1',
      draftId: 'REV-2025-074',
      claimText: 'Clinically proven to completely eliminate flu vulnerability in 14 days',
      startIndex: 96,
      endIndex: 167,
      status: 'contradicted',
      severity: 'high',
      brandRuleId: 'RULE-3.1',
      brandRuleTitle: 'Prohibition of Absolute Protection & Disease Elimination Guarantees',
      explanation:
        'Disease prevention and elimination claims violate FDA 21 CFR §101.93 and Section 2.4 of the Clinical Marketing Guidelines.',
      confidenceScore: 99,
      suggestedCorrection:
        'Formulated to support natural immune resilience during seasonal transitions',
      suggestionStatus: 'unapplied',
      evidence: {
        documentId: 'doc-1',
        documentName: 'Acme Clinical Marketing Guidelines 2025',
        documentVersion: 'v2.1',
        pageNumber: 12,
        sectionHeading: 'Section 2.4: Efficacy Limitations & Absolute Statements',
        citationId: 'CIT-DOC1-P12-S2.4',
        relevanceScore: 99,
        verbatimPassage:
          'RULE 3.1: Absolute immunity guarantees, cure declarations, or claims of 100% protection against airborne or infectious pathogens are strictly prohibited under FDA 21 CFR §101.93 and FTC guidelines. Marketing copy must phrase benefits as "supports healthy immune response", "promotes cellular resilience", or "assists natural defenses". Timed onset guarantees (e.g., "within 30 minutes") are strictly prohibited unless supported by specific human pharmacokinetics trials on file.',
      },
    },
    {
      id: 'fnd-74-2',
      draftId: 'REV-2025-074',
      claimText: 'One daily dose replaces your entire morning vitamin regimen',
      startIndex: 35,
      endIndex: 94,
      status: 'contradicted',
      severity: 'high',
      brandRuleId: 'RULE-2.3',
      brandRuleTitle: 'Prohibition of Blanket Dietary Regimen Replacement Claims',
      explanation:
        'Claiming a botanical supplement replaces an entire dietary regimen violates DSHEA substantiation rules in doc-2.',
      confidenceScore: 94,
      suggestedCorrection:
        'A convenient daily supplement to complement your balanced nutrition routine',
      suggestionStatus: 'unapplied',
      evidence: {
        documentId: 'doc-2',
        documentName: 'FDA & FTC Regulatory Compliance Manual',
        documentVersion: 'v1.4',
        pageNumber: 8,
        sectionHeading: 'Section 2.1: DSHEA Mandatory Disclaimer Presentation',
        citationId: 'CIT-DOC2-P8-S2.1',
        relevanceScore: 93,
        verbatimPassage:
          'RULE 2.3: Every consumer marketing piece making nutritional structure/function claims must display the FDA disclaimer in prominent typography: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."',
      },
    },
    {
      id: 'fnd-74-3',
      draftId: 'REV-2025-074',
      claimText: 'Tap the link in bio to order now with free shipping',
      startIndex: 202,
      endIndex: 254,
      status: 'verified',
      severity: 'low',
      brandRuleId: 'RULE-1.1',
      brandRuleTitle: 'Digital Direct-to-Consumer Fulfillment Disclosure',
      explanation:
        'Standard call-to-action and fulfillment terms comply with digital promotional standards.',
      confidenceScore: 98,
      suggestionStatus: 'unapplied',
      evidence: {
        documentId: 'doc-2',
        documentName: 'FDA & FTC Regulatory Compliance Manual',
        documentVersion: 'v1.4',
        pageNumber: 8,
        sectionHeading: 'Section 2.1: DSHEA Mandatory Disclaimer Presentation',
        citationId: 'CIT-DOC2-P8-S2.1',
        relevanceScore: 90,
        verbatimPassage:
          'RULE 2.3: Every consumer marketing piece making nutritional structure/function claims must display the FDA disclaimer in prominent typography: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."',
      },
    },
  ],

  'REV-2025-061': [
    {
      id: 'fnd-61-1',
      draftId: 'REV-2025-061',
      claimText: 'zinc bisglycinate and standardized anthocyanin elderberry extract',
      startIndex: 125,
      endIndex: 191,
      status: 'verified',
      severity: 'low',
      brandRuleId: 'RULE-1.4',
      brandRuleTitle: 'Nutrient & Active Polyphenol Potency Verification',
      explanation:
        'Formulation correctly specifies active zinc chelate and standardized elderberry extract conforming to COA-2024-B.',
      confidenceScore: 99,
      suggestionStatus: 'unapplied',
      evidence: {
        documentId: 'doc-3',
        documentName: 'Product Specifications: ImmunoShield Pro',
        documentVersion: 'v3.0',
        pageNumber: 4,
        sectionHeading: 'Section 1.2: Active Bio-Available Potency Spec',
        citationId: 'CIT-DOC3-P4-S1.2',
        relevanceScore: 99,
        verbatimPassage:
          'ImmunoShield Pro delivers 15mg elemental zinc in high-absorption bisglycinate chelate form combined with 450mg European Black Elderberry standardized to 45% total polyphenols. Batch analysis confirms allergen-free and vegan certification.',
      },
    },
    {
      id: 'fnd-61-2',
      draftId: 'REV-2025-061',
      claimText: 'support healthy immunological markers in adult patients',
      startIndex: 195,
      endIndex: 251,
      status: 'verified',
      severity: 'low',
      brandRuleId: 'RULE-3.1',
      brandRuleTitle: 'Approved DSHEA Structure/Function Terminology',
      explanation:
        'Structure/function claim uses approved qualifying language without disease mitigation claims.',
      confidenceScore: 97,
      suggestionStatus: 'unapplied',
      evidence: {
        documentId: 'doc-1',
        documentName: 'Acme Clinical Marketing Guidelines 2025',
        documentVersion: 'v2.1',
        pageNumber: 12,
        sectionHeading: 'Section 2.4: Efficacy Limitations & Absolute Statements',
        citationId: 'CIT-DOC1-P12-S2.4',
        relevanceScore: 96,
        verbatimPassage:
          'RULE 3.1: Absolute immunity guarantees, cure declarations, or claims of 100% protection against airborne or infectious pathogens are strictly prohibited under FDA 21 CFR §101.93 and FTC guidelines. Marketing copy must phrase benefits as "supports healthy immune response", "promotes cellular resilience", or "assists natural defenses". Timed onset guarantees (e.g., "within 30 minutes") are strictly prohibited unless supported by specific human pharmacokinetics trials on file.',
      },
    },
    {
      id: 'fnd-61-3',
      draftId: 'REV-2025-061',
      claimText: 'full availability of ImmunoShield Pro for your integrative wellness practice',
      startIndex: 44,
      endIndex: 120,
      status: 'verified',
      severity: 'low',
      brandRuleId: 'RULE-1.1',
      brandRuleTitle: 'Standardized Active Ingredients & Potency',
      explanation:
        'Practitioner distribution announcement aligns with verified product naming conventions.',
      confidenceScore: 98,
      suggestionStatus: 'unapplied',
      evidence: {
        documentId: 'doc-1',
        documentName: 'Acme Clinical Marketing Guidelines 2025',
        documentVersion: 'v2.1',
        pageNumber: 5,
        sectionHeading: 'Section 1.1: Standardized Active Ingredients & Potency',
        citationId: 'CIT-DOC1-P5-S1.1',
        relevanceScore: 95,
        verbatimPassage:
          'All finished products must cite standardized extract levels verified by valid Certificate of Analysis (COA). Standardized bio-actives such as polyphenols, flavonoids, and chelated minerals must disclose verified percentage assays conforming to Master Specification COA-2024-B.',
      },
    },
  ],

  'REV-2025-048': [
    {
      id: 'fnd-48-1',
      draftId: 'REV-2025-048',
      claimText: 'ImmunoShield Pro supports vitality during temperature shifts',
      startIndex: 27,
      endIndex: 87,
      status: 'verified',
      severity: 'low',
      brandRuleId: 'RULE-3.1',
      brandRuleTitle: 'Approved DSHEA Structure/Function Terminology',
      explanation:
        'Vitality support phrasing conforms strictly to structure/function language guidelines.',
      confidenceScore: 97,
      suggestionStatus: 'unapplied',
      evidence: {
        documentId: 'doc-1',
        documentName: 'Acme Clinical Marketing Guidelines 2025',
        documentVersion: 'v2.1',
        pageNumber: 12,
        sectionHeading: 'Section 2.4: Efficacy Limitations & Absolute Statements',
        citationId: 'CIT-DOC1-P12-S2.4',
        relevanceScore: 96,
        verbatimPassage:
          'RULE 3.1: Absolute immunity guarantees, cure declarations, or claims of 100% protection against airborne or infectious pathogens are strictly prohibited under FDA 21 CFR §101.93 and FTC guidelines. Marketing copy must phrase benefits as "supports healthy immune response", "promotes cellular resilience", or "assists natural defenses". Timed onset guarantees (e.g., "within 30 minutes") are strictly prohibited unless supported by specific human pharmacokinetics trials on file.',
      },
    },
    {
      id: 'fnd-48-2',
      draftId: 'REV-2025-048',
      claimText: 'Mandatory #Ad and #Sponsored tags must appear in the first 2 lines',
      startIndex: 164,
      endIndex: 231,
      status: 'verified',
      severity: 'low',
      brandRuleId: 'RULE-2.3',
      brandRuleTitle: 'FTC Endorsement Guide Disclosure Standards',
      explanation:
        'Mandatory above-the-fold commercial tagging adheres directly to FTC endorsement guidelines.',
      confidenceScore: 98,
      suggestionStatus: 'unapplied',
      evidence: {
        documentId: 'doc-2',
        documentName: 'FDA & FTC Regulatory Compliance Manual',
        documentVersion: 'v1.4',
        pageNumber: 8,
        sectionHeading: 'Section 2.1: DSHEA Mandatory Disclaimer Presentation',
        citationId: 'CIT-DOC2-P8-S2.1',
        relevanceScore: 95,
        verbatimPassage:
          'RULE 2.3: Every consumer marketing piece making nutritional structure/function claims must display the FDA disclaimer in prominent typography: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."',
      },
    },
  ],
}

export async function runPatch(dryRun: boolean = true) {
  console.log(`[BrandOS Data Integrity Patch] Mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`)

  const totalFindingsToPatch = Object.values(PATCHED_FINDINGS_BY_DRAFT).reduce(
    (acc, arr) => acc + arr.length,
    0
  )
  console.log(`Prepared ${totalFindingsToPatch} findings across ${Object.keys(PATCHED_FINDINGS_BY_DRAFT).length} review drafts.`)

  const client = getSupabaseClient()
  if (!client) {
    console.log('[Notice] Supabase is not configured; patch targets development repository & mock data stores.')
    return { dryRun, totalFindingsToPatch, appliedCount: 0 }
  }

  let appliedCount = 0
  for (const [draftId, findings] of Object.entries(PATCHED_FINDINGS_BY_DRAFT)) {
    console.log(`Draft ${draftId}: ${findings.length} findings to patch...`)
    if (!dryRun) {
      for (const f of findings) {
        const row = {
          id: f.id,
          draft_id: f.draftId,
          claim_text: f.claimText,
          start_index: f.startIndex,
          end_index: f.endIndex,
          status: f.status,
          severity: f.severity,
          brand_rule_id: f.brandRuleId,
          brand_rule_title: f.brandRuleTitle,
          explanation: f.explanation,
          confidence_score: f.confidenceScore,
          suggested_correction: f.suggestedCorrection,
          suggestion_status: f.suggestionStatus || 'unapplied',
          document_id: f.evidence.documentId,
          document_name: f.evidence.documentName,
          document_version: f.evidence.documentVersion,
          page_number: f.evidence.pageNumber,
          section_heading: f.evidence.sectionHeading,
          verbatim_passage: f.evidence.verbatimPassage,
          citation_id: f.evidence.citationId,
          relevance_score: f.evidence.relevanceScore,
        }
        const { error } = await client.from('findings').upsert(row)
        if (error) {
          console.error(`Failed to upsert finding ${f.id}:`, error.message)
        } else {
          appliedCount++
        }
      }
    }
  }

  console.log(`[Complete] ${dryRun ? 'Dry run completed successfully.' : `Applied ${appliedCount} findings to database.`}`)
  return { dryRun, totalFindingsToPatch, appliedCount }
}

// CLI execution check
if (process.argv[1]?.includes('patch_data_integrity')) {
  const isApply = process.argv.includes('--apply')
  runPatch(!isApply).catch((err) => {
    console.error('Patch execution failed:', err)
    process.exit(1)
  })
}
