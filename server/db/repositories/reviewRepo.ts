import { ReviewDraft, Finding, ApprovalDecision, ReviewStatus } from '../../types'
import { getSupabaseClient } from '../supabase'
import { env, getServiceConfigStatus } from '../../config/env'
import { ServiceNotConfiguredError, NotFoundError } from '../../services/errors'

let devReviews: ReviewDraft[] = [
  {
    id: 'REV-2025-089',
    title: 'ImmunoShield Pro Hero & Features Landing Page Copy',
    contentType: 'landing_page',
    campaignName: 'Winter Wellness Launch 2026',
    workspaceId: 'ws-1',
    submittedBy: {
      id: 'usr-3',
      name: 'Sophia Chen',
      email: 'sophia.chen@acmehealth.com',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    },
    submittedAt: '2026-10-24T14:22:00Z',
    updatedAt: '2026-10-25T09:15:00Z',
    originalText: `Meet ImmunoShield Pro: the pinnacle of cellular defense. Our breakthrough formula delivers guaranteed 100% immunity against airborne pathogens within 30 minutes of consumption. Clinically proven by Mayo Clinic researchers in a double-blind peer-reviewed trial, our active complex empowers your system when you need it most. Each dose is sustainably harvested using 100% zero-carbon cold extraction technology, protecting both your health and the planet. Standardized to 45% active polyphenols and bio-fermented zinc, ImmunoShield Pro gives you unconditional peace of mind every single day.`,
    currentText: `Meet ImmunoShield Pro: the pinnacle of cellular defense. Our breakthrough formula delivers guaranteed 100% immunity against airborne pathogens within 30 minutes of consumption. Clinically proven by Mayo Clinic researchers in a double-blind peer-reviewed trial, our active complex empowers your system when you need it most. Each dose is sustainably harvested using 100% zero-carbon cold extraction technology, protecting both your health and the planet. Standardized to 45% active polyphenols and bio-fermented zinc, ImmunoShield Pro gives you unconditional peace of mind every single day.`,
    guidelineDocumentIds: ['doc-1', 'doc-2', 'doc-3', 'doc-4'],
    status: 'ready_for_approval',
    stats: {
      totalClaims: 4,
      verified: 1,
      contradicted: 2,
      needsVerification: 1,
      highSeverityCount: 2,
    },
    findings: [
      {
        id: 'fnd-1',
        draftId: 'REV-2025-089',
        claimText: 'guaranteed 100% immunity against airborne pathogens within 30 minutes of consumption',
        startIndex: 83,
        endIndex: 167,
        status: 'contradicted',
        severity: 'high',
        brandRuleId: 'RULE-3.1',
        brandRuleTitle: 'Prohibition of Absolute Protection & Speed Guarantees',
        explanation:
          'Absolute immunity claims ("guaranteed 100%") and specific speed promises ("within 30 minutes") directly contradict FDA 21 CFR §101.93 and Section 2.4 of the Clinical Marketing Guidelines.',
        confidenceScore: 98,
        suggestedCorrection:
          'formulated to support healthy immune defense and rapid cellular resilience in adults',
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
        id: 'fnd-2',
        draftId: 'REV-2025-089',
        claimText: 'Clinically proven by Mayo Clinic researchers in a double-blind peer-reviewed trial',
        startIndex: 169,
        endIndex: 247,
        status: 'contradicted',
        severity: 'high',
        brandRuleId: 'RULE-4.8',
        brandRuleTitle: 'Prohibition of Unauthorized Institutional Co-Branding',
        explanation:
          'Mentioning specific third-party clinical institutions (Mayo Clinic) by name violates brand endorsement policies unless formal institutional review board agreements are on file.',
        confidenceScore: 95,
        suggestedCorrection:
          'Evaluated in independent randomized double-blind clinical trials published in peer-reviewed scientific journals',
        suggestionStatus: 'unapplied',
        evidence: {
          documentId: 'doc-1',
          documentName: 'Acme Clinical Marketing Guidelines 2025',
          documentVersion: 'v2.1',
          pageNumber: 19,
          sectionHeading: 'Section 4.2: Institutional Co-branding & Research Affiliations',
          citationId: 'CIT-DOC1-P19-S4.2',
          relevanceScore: 97,
          verbatimPassage:
            'RULE 4.8: Specific academic or medical institutional endorsements (such as Mayo Clinic, Harvard, Johns Hopkins) may never be cited without formal executed institutional review board agreements and corporate legal sign-off. References must describe study protocols generally, e.g., "independent randomized, double-blind, placebo-controlled clinical trials published in peer-reviewed scientific journals."',
        },
      },
      {
        id: 'fnd-3',
        draftId: 'REV-2025-089',
        claimText: 'sustainably harvested using 100% zero-carbon cold extraction technology',
        startIndex: 312,
        endIndex: 382,
        status: 'needs_verification',
        severity: 'medium',
        brandRuleId: 'RULE-7.2',
        brandRuleTitle: 'Environmental & Zero-Carbon Claims Substantiation',
        explanation:
          'Unqualified "100% zero-carbon" claims require documented ISO-14064 certification records. Current documentation shows carbon offset matching, but not zero direct emissions.',
        confidenceScore: 89,
        suggestedCorrection:
          'sustainably harvested using energy-efficient cold extraction with verified carbon offset credits',
        suggestionStatus: 'unapplied',
        evidence: {
          documentId: 'doc-4',
          documentName: 'Global ESG & Sustainability Claims Standard',
          documentVersion: 'v1.2',
          pageNumber: 8,
          sectionHeading: 'Section 1.3: Carbon Footprint & Environmental Claims',
          citationId: 'CIT-DOC4-P8-S1.3',
          relevanceScore: 91,
          verbatimPassage:
            'RULE 7.2: Unqualified claims such as "100% zero-carbon" or "completely emission-free" are prohibited without a specific third-party ISO-14064 verified Life Cycle Assessment (LCA) identifier published in public brand disclosures. Marketing copy should specify "manufactured using verified renewable electricity with certified carbon offset retirement."',
        },
      },
      {
        id: 'fnd-4',
        draftId: 'REV-2025-089',
        claimText: 'Standardized to 45% active polyphenols and bio-fermented zinc',
        startIndex: 425,
        endIndex: 486,
        status: 'verified',
        severity: 'low',
        brandRuleId: 'RULE-1.4',
        brandRuleTitle: 'Nutrient & Active Polyphenol Potency Verification',
        explanation:
          'Claim accurately matches the active ingredient specification registered in Master Certificate of Analysis COA-2024-B for ImmunoShield Pro batch formulations.',
        confidenceScore: 99,
        suggestionStatus: 'unapplied',
        evidence: {
          documentId: 'doc-3',
          documentName: 'Product Specifications: ImmunoShield Pro',
          documentVersion: 'v3.0',
          pageNumber: 4,
          sectionHeading: 'Section 1.2: Active Bio-Available Potency Spec',
          citationId: 'CIT-DOC3-P4-S1.2',
          relevanceScore: 98,
          verbatimPassage:
            'ImmunoShield Pro delivers 15mg elemental zinc in high-absorption bisglycinate chelate form combined with 450mg European Black Elderberry standardized to 45% total polyphenols. Batch analysis confirms allergen-free and vegan certification.',
        },
      },
    ],
  },
  {
    id: 'REV-2025-074',
    title: 'Q3 Paid Instagram Carousel — Clinical Defense Series',
    contentType: 'social_post',
    campaignName: 'Social Direct Response',
    workspaceId: 'ws-1',
    submittedBy: {
      id: 'usr-3',
      name: 'Sophia Chen',
      email: 'sophia.chen@acmehealth.com',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    },
    submittedAt: '2026-10-22T11:00:00Z',
    updatedAt: '2026-10-23T16:45:00Z',
    originalText: `Tired of seasonal fatigue? Slide 1: One daily dose replaces your entire morning vitamin regimen. Slide 2: Clinically proven to completely eliminate flu vulnerability in 14 days. Don't wait until you get sick. Tap the link in bio to order now with free shipping.`,
    currentText: `Tired of seasonal fatigue? Slide 1: One daily dose replaces your entire morning vitamin regimen. Slide 2: Clinically proven to completely eliminate flu vulnerability in 14 days. Don't wait until you get sick. Tap the link in bio to order now with free shipping.`,
    guidelineDocumentIds: ['doc-1', 'doc-2'],
    status: 'changes_requested',
    approvalDecision: {
      decision: 'changes_requested',
      reviewerId: 'usr-2',
      reviewerName: 'Marcus Vance',
      reviewerRole: 'Reviewer',
      comments:
        'Contains explicit disease prevention claims ("eliminate flu vulnerability"). This must be softened to structure/function language before paid placement.',
      timestamp: '2026-10-23T16:45:00Z',
    },
    stats: {
      totalClaims: 3,
      verified: 1,
      contradicted: 2,
      needsVerification: 0,
      highSeverityCount: 2,
    },
    findings: [
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
  },
  {
    id: 'REV-2025-061',
    title: 'Healthcare Professional Email Announcement: Q4 Advisory',
    contentType: 'email',
    campaignName: 'HCP Medical Outreach',
    workspaceId: 'ws-1',
    submittedBy: {
      id: 'usr-1',
      name: 'Elena Rostova',
      email: 'elena.rostova@acmehealth.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    submittedAt: '2026-10-18T09:30:00Z',
    updatedAt: '2026-10-19T14:10:00Z',
    originalText: `Dear Practitioner, we are pleased to announce full availability of ImmunoShield Pro for your integrative wellness practice. Each formulation includes zinc bisglycinate and standardized anthocyanin elderberry extract to support healthy immunological markers in adult patients. Request trial sample packs for your clinic today.`,
    currentText: `Dear Practitioner, we are pleased to announce full availability of ImmunoShield Pro for your integrative wellness practice. Each formulation includes zinc bisglycinate and standardized anthocyanin elderberry extract to support healthy immunological markers in adult patients. Request trial sample packs for your clinic today.`,
    guidelineDocumentIds: ['doc-1', 'doc-3'],
    status: 'approved',
    approvalDecision: {
      decision: 'approved',
      reviewerId: 'usr-2',
      reviewerName: 'Marcus Vance',
      reviewerRole: 'Reviewer',
      comments:
        'Exemplary structure/function copy. All active ingredients and clinical endpoints conform to DSHEA and brand guidelines.',
      timestamp: '2026-10-19T14:10:00Z',
    },
    stats: {
      totalClaims: 3,
      verified: 3,
      contradicted: 0,
      needsVerification: 0,
      highSeverityCount: 0,
    },
    findings: [
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
  },
  {
    id: 'REV-2025-048',
    title: 'Fall Seasonal Wellness Social Influencer Brief',
    contentType: 'social_post',
    campaignName: 'Influencer Guardrails',
    workspaceId: 'ws-1',
    submittedBy: {
      id: 'usr-3',
      name: 'Sophia Chen',
      email: 'sophia.chen@acmehealth.com',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    },
    submittedAt: '2026-10-25T17:15:00Z',
    updatedAt: '2026-10-25T17:15:00Z',
    originalText: `Creators must explain that ImmunoShield Pro supports vitality during temperature shifts. No creator may claim it cures common colds or replaces medical consultation. Mandatory #Ad and #Sponsored tags must appear in the first 2 lines.`,
    currentText: `Creators must explain that ImmunoShield Pro supports vitality during temperature shifts. No creator may claim it cures common colds or replaces medical consultation. Mandatory #Ad and #Sponsored tags must appear in the first 2 lines.`,
    guidelineDocumentIds: ['doc-1', 'doc-2', 'doc-5'],
    status: 'pending',
    stats: {
      totalClaims: 2,
      verified: 2,
      contradicted: 0,
      needsVerification: 0,
      highSeverityCount: 0,
    },
    findings: [
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
  },
]

export const reviewRepo = {
  async getReviews(params?: {
    status?: string
    contentType?: string
    search?: string
    workspaceId?: string
  }): Promise<ReviewDraft[]> {
    const client = getSupabaseClient()
    if (client) {
      let query = client.from('review_drafts').select('*, findings(*), approval_decisions(*)')
      if (params?.workspaceId) {
        query = query.eq('workspace_id', params.workspaceId)
      }
      if (params?.status && params.status !== 'all') {
        query = query.eq('status', params.status)
      }
      if (params?.contentType && params.contentType !== 'all') {
        query = query.eq('content_type', params.contentType)
      }
      if (params?.search) {
        query = query.ilike('title', `%${params.search}%`)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw new Error(`Database error fetching reviews: ${error.message}`)

      return (data || []).map((row: any) => {
        const rawFindings = (row.findings || []).map((f: any) => ({
          id: f.id,
          draftId: f.draft_id,
          claimText: f.claim_text,
          startIndex: f.start_index,
          endIndex: f.end_index,
          status: f.status,
          severity: f.severity,
          brandRuleId: f.brand_rule_id,
          brandRuleTitle: f.brand_rule_title,
          explanation: f.explanation,
          confidenceScore: f.confidence_score,
          suggestedCorrection: f.suggested_correction,
          suggestionStatus: f.suggestion_status,
          editedCorrection: f.edited_correction,
          evidence: {
            documentId: f.document_id,
            documentName: f.document_name,
            documentVersion: f.document_version,
            pageNumber: f.page_number,
            sectionHeading: f.section_heading,
            verbatimPassage: f.verbatim_passage,
            citationId: f.citation_id,
            relevanceScore: f.relevance_score,
          },
        }))

        const latestDecision = row.approval_decisions?.[0]

        return {
          id: row.id,
          title: row.title,
          contentType: row.content_type,
          campaignName: row.campaign_name,
          workspaceId: row.workspace_id,
          submittedBy: {
            id: row.submitted_by_id,
            name: row.submitted_by_name,
            email: row.submitted_by_email,
            avatar: row.submitted_by_avatar,
          },
          submittedAt: row.created_at,
          updatedAt: row.updated_at,
          originalText: row.original_text,
          currentText: row.current_text,
          guidelineDocumentIds: row.guideline_document_ids || [],
          status: row.status,
          approvalDecision: latestDecision
            ? {
                decision: latestDecision.decision,
                reviewerId: latestDecision.reviewer_id,
                reviewerName: latestDecision.reviewer_name,
                reviewerRole: latestDecision.reviewer_role,
                comments: latestDecision.comments,
                timestamp: latestDecision.created_at,
              }
            : undefined,
          findings: rawFindings,
          stats: {
            totalClaims: rawFindings.length,
            verified: rawFindings.filter((f: any) => f.status === 'verified').length,
            contradicted: rawFindings.filter((f: any) => f.status === 'contradicted').length,
            needsVerification: rawFindings.filter((f: any) => f.status === 'needs_verification').length,
            highSeverityCount: rawFindings.filter((f: any) => f.severity === 'high' && f.status === 'contradicted').length,
          },
        }
      })
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    let list = [...devReviews]
    if (params?.workspaceId) {
      list = list.filter((r) => !r.workspaceId || r.workspaceId === params.workspaceId)
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter((r) => r.status === params.status)
    }
    if (params?.contentType && params.contentType !== 'all') {
      list = list.filter((r) => r.contentType === params.contentType)
    }
    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.submittedBy.name.toLowerCase().includes(q)
      )
    }
    return list
  },

  async getReviewById(id: string): Promise<ReviewDraft | null> {
    const client = getSupabaseClient()
    if (client) {
      const { data: row, error } = await client
        .from('review_drafts')
        .select('*, findings(*), approval_decisions(*)')
        .eq('id', id)
        .single()
      if (error || !row) return null

      const rawFindings = (row.findings || []).map((f: any) => ({
        id: f.id,
        draftId: f.draft_id,
        claimText: f.claim_text,
        startIndex: f.start_index,
        endIndex: f.end_index,
        status: f.status,
        severity: f.severity,
        brandRuleId: f.brand_rule_id,
        brandRuleTitle: f.brand_rule_title,
        explanation: f.explanation,
        confidenceScore: f.confidence_score,
        suggestedCorrection: f.suggested_correction,
        suggestionStatus: f.suggestion_status,
        editedCorrection: f.edited_correction,
        evidence: {
          documentId: f.document_id,
          documentName: f.document_name,
          documentVersion: f.document_version,
          pageNumber: f.page_number,
          sectionHeading: f.section_heading,
          verbatimPassage: f.verbatim_passage,
          citationId: f.citation_id,
          relevanceScore: f.relevance_score,
        },
      }))

      const latestDecision = row.approval_decisions?.[0]

      return {
        id: row.id,
        title: row.title,
        contentType: row.content_type,
        campaignName: row.campaign_name,
        workspaceId: row.workspace_id,
        submittedBy: {
          id: row.submitted_by_id,
          name: row.submitted_by_name,
          email: row.submitted_by_email,
          avatar: row.submitted_by_avatar,
        },
        submittedAt: row.created_at,
        updatedAt: row.updated_at,
        originalText: row.original_text,
        currentText: row.current_text,
        guidelineDocumentIds: row.guideline_document_ids || [],
        status: row.status,
        approvalDecision: latestDecision
          ? {
              decision: latestDecision.decision,
              reviewerId: latestDecision.reviewer_id,
              reviewerName: latestDecision.reviewer_name,
              reviewerRole: latestDecision.reviewer_role,
              comments: latestDecision.comments,
              timestamp: latestDecision.created_at,
            }
          : undefined,
        findings: rawFindings,
        stats: {
          totalClaims: rawFindings.length,
          verified: rawFindings.filter((f: any) => f.status === 'verified').length,
          contradicted: rawFindings.filter((f: any) => f.status === 'contradicted').length,
          needsVerification: rawFindings.filter((f: any) => f.status === 'needs_verification').length,
          highSeverityCount: rawFindings.filter((f: any) => f.severity === 'high' && f.status === 'contradicted').length,
        },
      }
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    const r = devReviews.find((item) => item.id === id)
    return r ? { ...r } : null
  },

  async createReview(review: ReviewDraft): Promise<ReviewDraft> {
    const client = getSupabaseClient()
    if (client) {
      const { error: draftError } = await client.from('review_drafts').insert({
        id: review.id,
        workspace_id: review.workspaceId,
        title: review.title,
        content_type: review.contentType,
        campaign_name: review.campaignName,
        original_text: review.originalText,
        current_text: review.currentText,
        guideline_document_ids: review.guidelineDocumentIds,
        status: review.status,
        submitted_by_id: review.submittedBy.id,
        submitted_by_name: review.submittedBy.name,
        submitted_by_email: review.submittedBy.email,
        submitted_by_avatar: review.submittedBy.avatar,
      })
      if (draftError) throw new Error(`Failed to create review draft: ${draftError.message}`)

      if (review.findings && review.findings.length > 0) {
        const findingsToInsert = review.findings.map((f) => ({
          draft_id: review.id,
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
          edited_correction: f.editedCorrection,
          document_id: f.evidence.documentId,
          document_name: f.evidence.documentName,
          document_version: f.evidence.documentVersion,
          page_number: f.evidence.pageNumber,
          section_heading: f.evidence.sectionHeading,
          verbatim_passage: f.evidence.verbatimPassage,
          citation_id: f.evidence.citationId,
          relevance_score: f.evidence.relevanceScore,
        }))
        const { error: findError } = await client.from('findings').insert(findingsToInsert)
        if (findError) throw new Error(`Database error inserting findings: ${findError.message}`)
      }

      return review
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    devReviews.unshift(review)
    return review
  },

  async updateDraftText(reviewId: string, newText: string): Promise<ReviewDraft> {
    const review = await this.getReviewById(reviewId)
    if (!review) throw new NotFoundError('ReviewDraft', reviewId)

    review.currentText = newText
    review.updatedAt = new Date().toISOString()

    const client = getSupabaseClient()
    if (client) {
      await client
        .from('review_drafts')
        .update({ current_text: newText, updated_at: review.updatedAt })
        .eq('id', reviewId)
      return review
    }

    const idx = devReviews.findIndex((r) => r.id === reviewId)
    if (idx !== -1) devReviews[idx] = review
    return review
  },

  async applySuggestion(
    reviewId: string,
    findingId: string,
    customText?: string
  ): Promise<ReviewDraft> {
    const review = await this.getReviewById(reviewId)
    if (!review) throw new NotFoundError('ReviewDraft', reviewId)

    const finding = review.findings.find((f) => f.id === findingId)
    if (!finding) throw new NotFoundError('Finding', findingId)

    const replacement = customText || finding.suggestedCorrection
    if (!replacement) throw new Error('No suggested correction available to apply')

    if (review.currentText.includes(finding.claimText)) {
      review.currentText = review.currentText.replace(finding.claimText, replacement)
    } else {
      review.currentText =
        review.currentText.slice(0, finding.startIndex) +
        replacement +
        review.currentText.slice(finding.endIndex)
    }

    finding.suggestionStatus = customText ? 'edited' : 'applied'
    if (customText) finding.editedCorrection = customText
    finding.status = 'verified'
    finding.explanation = `Correction applied: "${replacement}". Claim is now compliant.`

    review.stats.verified = review.findings.filter((f) => f.status === 'verified').length
    review.stats.contradicted = review.findings.filter((f) => f.status === 'contradicted').length
    review.stats.needsVerification = review.findings.filter((f) => f.status === 'needs_verification').length
    review.stats.highSeverityCount = review.findings.filter(
      (f) => f.severity === 'high' && f.status === 'contradicted'
    ).length
    review.updatedAt = new Date().toISOString()

    const client = getSupabaseClient()
    if (client) {
      await client
        .from('review_drafts')
        .update({ current_text: review.currentText, updated_at: review.updatedAt })
        .eq('id', reviewId)

      await client
        .from('findings')
        .update({
          status: 'verified',
          suggestion_status: finding.suggestionStatus,
          edited_correction: finding.editedCorrection,
          explanation: finding.explanation,
        })
        .eq('id', findingId)

      return review
    }

    const idx = devReviews.findIndex((r) => r.id === reviewId)
    if (idx !== -1) devReviews[idx] = review
    return review
  },

  async rejectSuggestion(reviewId: string, findingId: string): Promise<ReviewDraft> {
    const review = await this.getReviewById(reviewId)
    if (!review) throw new NotFoundError('ReviewDraft', reviewId)

    const finding = review.findings.find((f) => f.id === findingId)
    if (!finding) throw new NotFoundError('Finding', findingId)

    finding.suggestionStatus = 'rejected'
    review.updatedAt = new Date().toISOString()

    const client = getSupabaseClient()
    if (client) {
      await client
        .from('findings')
        .update({ suggestion_status: 'rejected' })
        .eq('id', findingId)
      return review
    }

    const idx = devReviews.findIndex((r) => r.id === reviewId)
    if (idx !== -1) devReviews[idx] = review
    return review
  },

  async submitDecision(reviewId: string, decision: ApprovalDecision): Promise<ReviewDraft> {
    const review = await this.getReviewById(reviewId)
    if (!review) throw new NotFoundError('ReviewDraft', reviewId)

    review.approvalDecision = decision
    review.status = decision.decision
    review.updatedAt = new Date().toISOString()

    const client = getSupabaseClient()
    if (client) {
      await client
        .from('review_drafts')
        .update({ status: review.status, updated_at: review.updatedAt })
        .eq('id', reviewId)

      await client.from('approval_decisions').insert({
        draft_id: reviewId,
        decision: decision.decision,
        reviewer_id: decision.reviewerId,
        reviewer_name: decision.reviewerName,
        reviewer_role: decision.reviewerRole,
        comments: decision.comments,
      })

      return review
    }

    const idx = devReviews.findIndex((r) => r.id === reviewId)
    if (idx !== -1) devReviews[idx] = review
    return review
  },
}
