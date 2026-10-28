import { BrandDocument, DocumentSection, DocumentCategory, DocumentStatus } from '../../types'
import { getSupabaseClient } from '../supabase'
import { env, getServiceConfigStatus } from '../../config/env'
import { ServiceNotConfiguredError, NotFoundError } from '../../services/errors'
import { generateEmbedding } from '../../services/rag/embeddings'

// Initial seed data for development fallback mode
let devDocuments: BrandDocument[] = [
  {
    id: 'doc-1',
    workspaceId: 'ws-1',
    name: 'Acme Clinical Marketing Guidelines 2025',
    originalFileName: 'Acme_Clinical_Marketing_Guidelines_2025_v2.1.pdf',
    category: 'Clinical & Efficacy',
    version: 'v2.1',
    sizeBytes: 4820000,
    uploadedAt: '2026-09-14T10:30:00Z',
    uploadedBy: 'Elena Rostova',
    status: 'active',
    processingStatus: 'indexed',
    pageCount: 34,
    extractedRulesCount: 42,
    summary:
      'Defines permissible efficacy claims, clinical study substantiation standards, prohibited health benefit guarantees, and mandatory disclaimers for nutritional formulations.',
    sections: [
      {
        id: 'sec-1-1',
        documentId: 'doc-1',
        pageNumber: 5,
        heading: 'Section 1.1: Standardized Active Ingredients & Potency',
        ruleCount: 6,
        summary: 'Rules regarding naming conventions and assay verification for botanical extracts.',
        extractedText:
          'All finished products must cite standardized extract levels verified by valid Certificate of Analysis (COA). Standardized bio-actives such as polyphenols, flavonoids, and chelated minerals must disclose verified percentage assays conforming to Master Specification COA-2024-B.',
        keywords: ['standardized', 'extract', 'polyphenols', 'assay', 'coa', 'minerals', 'active'],
      },
      {
        id: 'sec-1-2',
        documentId: 'doc-1',
        pageNumber: 12,
        heading: 'Section 2.4: Efficacy Limitations & Absolute Statements',
        ruleCount: 14,
        summary: 'Prohibition of absolute prevention, cure, or guaranteed protection language.',
        extractedText:
          'RULE 3.1: Absolute immunity guarantees, cure declarations, or claims of 100% protection against airborne or infectious pathogens are strictly prohibited under FDA 21 CFR §101.93 and FTC guidelines. Marketing copy must phrase benefits as "supports healthy immune response", "promotes cellular resilience", or "assists natural defenses". Timed onset guarantees (e.g., "within 30 minutes") are strictly prohibited unless supported by specific human pharmacokinetics trials on file.',
        keywords: ['guaranteed', '100%', 'immunity', 'cure', 'pathogens', '30 minutes', 'speed', 'fda', 'ftc'],
      },
      {
        id: 'sec-1-3',
        documentId: 'doc-1',
        pageNumber: 19,
        heading: 'Section 4.2: Institutional Co-branding & Research Affiliations',
        ruleCount: 8,
        summary: 'Permissible references to independent researchers and institutions.',
        extractedText:
          'RULE 4.8: Specific academic or medical institutional endorsements (such as Mayo Clinic, Harvard, Johns Hopkins) may never be cited without formal executed institutional review board agreements and corporate legal sign-off. References must describe study protocols generally, e.g., "independent randomized, double-blind, placebo-controlled clinical trials published in peer-reviewed scientific journals."',
        keywords: ['mayo clinic', 'harvard', 'johns hopkins', 'endorsement', 'clinical trials', 'peer-reviewed'],
      },
    ],
  },
  {
    id: 'doc-2',
    workspaceId: 'ws-1',
    name: 'FDA & FTC Regulatory Compliance Manual',
    originalFileName: 'Acme_Regulatory_Compliance_Manual_FDA_FTC_v1.4.pdf',
    category: 'Legal & Regulatory',
    version: 'v1.4',
    sizeBytes: 7420000,
    uploadedAt: '2026-08-20T14:15:00Z',
    uploadedBy: 'Marcus Vance',
    status: 'active',
    processingStatus: 'indexed',
    pageCount: 58,
    extractedRulesCount: 67,
    summary:
      'Comprehensive regulatory standards covering DSHEA statutory disclaimers, substantiation dossiers, and deceptive advertising safeguards.',
    sections: [
      {
        id: 'sec-2-1',
        documentId: 'doc-2',
        pageNumber: 8,
        heading: 'Section 2.1: DSHEA Mandatory Disclaimer Presentation',
        ruleCount: 12,
        summary: 'Font size, placement, and bounding box requirements for statutory disclosures.',
        extractedText:
          'RULE 2.3: Every consumer marketing piece making nutritional structure/function claims must display the FDA disclaimer in prominent typography: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."',
        keywords: ['fda disclaimer', 'dshea', 'diagnose', 'treat', 'cure', 'prevent', 'statutory'],
      },
    ],
  },
  {
    id: 'doc-3',
    workspaceId: 'ws-1',
    name: 'Product Specifications: ImmunoShield Pro',
    originalFileName: 'Acme_Product_Specs_ImmunoShield_v3.0.pdf',
    category: 'Product Specifications',
    version: 'v3.0',
    sizeBytes: 2950000,
    uploadedAt: '2026-09-02T09:00:00Z',
    uploadedBy: 'Elena Rostova',
    status: 'active',
    processingStatus: 'indexed',
    pageCount: 18,
    extractedRulesCount: 25,
    summary:
      'Formulation bill of materials, clinical trial registry numbers, stability data, and active ingredient percentages for the ImmunoShield Pro line.',
    sections: [
      {
        id: 'sec-3-1',
        documentId: 'doc-3',
        pageNumber: 4,
        heading: 'Section 1.2: Active Bio-Available Potency Spec',
        ruleCount: 5,
        summary: 'Permissible potency phrasing for zinc bisglycinate and elderberry matrix.',
        extractedText:
          'ImmunoShield Pro delivers 15mg elemental zinc in high-absorption bisglycinate chelate form combined with 450mg European Black Elderberry standardized to 45% total polyphenols. Batch analysis confirms allergen-free and vegan certification.',
        keywords: ['immunoshield', 'zinc', 'polyphenols', '45%', 'elderberry', 'bisglycinate', 'vegan'],
      },
    ],
  },
  {
    id: 'doc-4',
    workspaceId: 'ws-1',
    name: 'Global ESG & Sustainability Claims Standard',
    originalFileName: 'Acme_Global_ESG_Claims_Standard_v1.2.pdf',
    category: 'ESG & Sustainability',
    version: 'v1.2',
    sizeBytes: 3100000,
    uploadedAt: '2026-07-15T11:45:00Z',
    uploadedBy: 'Marcus Vance',
    status: 'active',
    processingStatus: 'indexed',
    pageCount: 22,
    extractedRulesCount: 19,
    summary:
      'Green claims guardrails, carbon neutrality audit requirements, packaging recyclable statements, and third-party fair trade verifications.',
    sections: [
      {
        id: 'sec-4-1',
        documentId: 'doc-4',
        pageNumber: 8,
        heading: 'Section 1.3: Carbon Footprint & Environmental Claims',
        ruleCount: 7,
        summary: 'Evidence criteria for zero-carbon, carbon-neutral, and net-zero terminology.',
        extractedText:
          'RULE 7.2: Unqualified claims such as "100% zero-carbon" or "completely emission-free" are prohibited without a specific third-party ISO-14064 verified Life Cycle Assessment (LCA) identifier published in public brand disclosures. Marketing copy should specify "manufactured using verified renewable electricity with certified carbon offset retirement."',
        keywords: ['zero-carbon', 'carbon-neutral', 'iso-14064', 'emission-free', 'sustainability', 'green', 'offset'],
      },
    ],
  },
  {
    id: 'doc-5',
    workspaceId: 'ws-1',
    name: 'Brand Voice, Trademark & Typography Guardrails',
    originalFileName: 'Acme_Brand_Voice_Trademark_Guardrails_v4.0.pdf',
    category: 'Trademark & IP',
    version: 'v4.0',
    sizeBytes: 2150000,
    uploadedAt: '2026-06-10T16:20:00Z',
    uploadedBy: 'Elena Rostova',
    status: 'active',
    processingStatus: 'indexed',
    pageCount: 15,
    extractedRulesCount: 31,
    summary:
      'Guidelines for trademark symbol usage (ImmunoShield®), headline capitalization, approved tone descriptors, and forbidden hype terminology.',
    sections: [
      {
        id: 'sec-5-1',
        documentId: 'doc-5',
        pageNumber: 3,
        heading: 'Section 1.1: Trademark Symbol Rules',
        ruleCount: 9,
        summary: 'Mandatory registered trademark symbol in first prominent headline.',
        extractedText:
          'RULE 1.2: The registered trademark symbol ® must appear on the first prominent headline mention of ImmunoShield® in any promotional asset. Subsequent body copy mentions may omit the symbol.',
        keywords: ['trademark', 'symbol', 'immunoshield', 'headline', 'guardrail'],
      },
    ],
  },
]

export const documentRepo = {
  async getDocuments(params?: {
    search?: string
    category?: string
    status?: string
    workspaceId?: string
  }): Promise<BrandDocument[]> {
    const client = getSupabaseClient()
    if (client) {
      let query = client.from('brand_documents').select('*, sections:document_sections(*)')
      if (params?.workspaceId) {
        query = query.eq('workspace_id', params.workspaceId)
      }
      if (params?.status && params.status !== 'all') {
        query = query.eq('status', params.status)
      }
      if (params?.category && params.category !== 'all') {
        query = query.eq('category', params.category)
      }
      if (params?.search) {
        query = query.ilike('name', `%${params.search}%`)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw new Error(`Database error fetching documents: ${error.message}`)
      return (data || []).map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        originalFileName: row.original_file_name,
        category: row.category,
        version: row.version,
        sizeBytes: Number(row.size_bytes),
        fileUrl: row.file_url,
        status: row.status,
        processingStatus: row.processing_status,
        pageCount: row.page_count,
        extractedRulesCount: row.extracted_rules_count,
        summary: row.summary,
        uploadedAt: row.created_at,
        uploadedBy: row.uploaded_by_name || 'System',
        sections: (row.sections || []).map((s: any) => ({
          id: s.id,
          pageNumber: s.page_number,
          heading: s.heading,
          ruleCount: s.rule_count,
          summary: s.summary,
          extractedText: s.extracted_text,
          keywords: s.keywords || [],
        })),
      }))
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    let list = [...devDocuments]
    if (params?.workspaceId) {
      list = list.filter((d) => (d.workspaceId || 'ws-1') === params.workspaceId)
    }
    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.originalFileName.toLowerCase().includes(q)
      )
    }
    if (params?.category && params.category !== 'all') {
      list = list.filter((d) => d.category === params.category)
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter((d) => d.status === params.status)
    }
    return list
  },

  async getDocumentById(id: string): Promise<BrandDocument | null> {
    const client = getSupabaseClient()
    if (client) {
      const { data, error } = await client
        .from('brand_documents')
        .select('*, sections:document_sections(*)')
        .eq('id', id)
        .single()
      if (error || !data) return null
      return {
        id: data.id,
        workspaceId: data.workspace_id,
        name: data.name,
        originalFileName: data.original_file_name,
        category: data.category,
        version: data.version,
        sizeBytes: Number(data.size_bytes),
        fileUrl: data.file_url,
        status: data.status,
        processingStatus: data.processing_status,
        pageCount: data.page_count,
        extractedRulesCount: data.extracted_rules_count,
        summary: data.summary,
        uploadedAt: data.created_at,
        uploadedBy: data.uploaded_by_name || 'System',
        sections: (data.sections || []).map((s: any) => ({
          id: s.id,
          pageNumber: s.page_number,
          heading: s.heading,
          ruleCount: s.rule_count,
          summary: s.summary,
          extractedText: s.extracted_text,
          keywords: s.keywords || [],
        })),
      }
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    const doc = devDocuments.find((d) => d.id === id)
    return doc ? { ...doc } : null
  },

  async createDocument(doc: BrandDocument): Promise<BrandDocument> {
    const client = getSupabaseClient()
    if (client) {
      const { data: insertedDoc, error: docError } = await client
        .from('brand_documents')
        .insert({
          id: doc.id,
          workspace_id: doc.workspaceId || 'ws-1',
          name: doc.name,
          original_file_name: doc.originalFileName,
          category: doc.category,
          version: doc.version,
          size_bytes: doc.sizeBytes,
          file_url: doc.fileUrl,
          status: doc.status,
          processing_status: doc.processingStatus,
          page_count: doc.pageCount,
          extracted_rules_count: doc.extractedRulesCount,
          summary: doc.summary,
          uploaded_by_name: doc.uploadedBy,
        })
        .select()
        .single()

      if (docError) throw new Error(`Failed to insert document: ${docError.message}`)

      if (doc.sections && doc.sections.length > 0) {
        const sectionsToInsert = await Promise.all(
          doc.sections.map(async (s) => {
            const emb = s.embedding || (await generateEmbedding(`${s.heading}: ${s.extractedText}`))
            return {
              document_id: doc.id,
              page_number: s.pageNumber,
              heading: s.heading,
              rule_count: s.ruleCount,
              summary: s.summary,
              extracted_text: s.extractedText,
              keywords: s.keywords || [],
              embedding: emb,
            }
          })
        )
        const { error: secError } = await client.from('document_sections').insert(sectionsToInsert)
        if (secError) throw new Error(`Database error inserting document sections: ${secError.message}`)
      }

      return doc
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    devDocuments.unshift(doc)
    return doc
  },

  async archiveDocument(id: string): Promise<BrandDocument> {
    const client = getSupabaseClient()
    if (client) {
      const existing = await this.getDocumentById(id)
      if (!existing) throw new NotFoundError('BrandDocument', id)
      const nextStatus: DocumentStatus = existing.status === 'active' ? 'archived' : 'active'
      const { error } = await client
        .from('brand_documents')
        .update({ status: nextStatus })
        .eq('id', id)
      if (error) throw new Error(`Failed to update status: ${error.message}`)
      existing.status = nextStatus
      return existing
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    const doc = devDocuments.find((d) => d.id === id)
    if (!doc) throw new NotFoundError('BrandDocument', id)
    doc.status = doc.status === 'active' ? 'archived' : 'active'
    return { ...doc }
  },

  async deleteDocument(id: string): Promise<boolean> {
    const client = getSupabaseClient()
    if (client) {
      const { error } = await client.from('brand_documents').delete().eq('id', id)
      if (error) throw new Error(`Failed to delete document: ${error.message}`)
      return true
    }

    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError('Supabase Database', getServiceConfigStatus().supabase.missingVars)
    }

    const index = devDocuments.findIndex((d) => d.id === id)
    if (index === -1) return false
    devDocuments.splice(index, 1)
    return true
  },

  async getDocumentSectionsForRetrieval(documentIds?: string[]): Promise<
    (DocumentSection & { documentName: string; documentVersion: string })[]
  > {
    const docs = await this.getDocuments({ status: 'active' })
    const filtered = documentIds && documentIds.length > 0
      ? docs.filter((d) => documentIds.includes(d.id))
      : docs

    const allSections: (DocumentSection & { documentName: string; documentVersion: string })[] = []
    filtered.forEach((d) => {
      d.sections.forEach((s) => {
        allSections.push({
          ...s,
          documentId: d.id,
          documentName: d.name,
          documentVersion: d.version,
        })
      })
    })

    return allSections
  },
}
