import { Router, Request, Response, NextFunction } from 'express'
import { uploadPdf } from '../middleware/upload'
import { documentRepo } from '../db/repositories/documentRepo'
import { auditRepo } from '../db/repositories/auditRepo'
import { extractPdfText } from '../services/pdf/extractor'
import { chunkPageAwareText } from '../services/pdf/chunker'
import { uploadToSupabaseStorage } from '../db/supabase'
import { env } from '../config/env'
import { BrandDocument, DocumentCategory } from '../types'
import { NotFoundError, ValidationError } from '../services/errors'

export const documentRouter = Router()

/**
 * GET /api/documents
 * List all guideline documents with optional search, category, and status filters
 */
documentRouter.get('/documents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, category, status } = req.query
    const documents = await documentRepo.getDocuments({
      search: search as string,
      category: category as string,
      status: status as string,
      workspaceId: req.workspaceId,
    })
    res.json(documents)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/documents/:id
 * Retrieve a single guideline document and its parsed sections
 */
documentRouter.get('/documents/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const document = await documentRepo.getDocumentById(id)
    if (!document) {
      throw new NotFoundError('BrandDocument', id)
    }
    res.json(document)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/documents/upload
 * Accepts a PDF file upload, extracts pages and text, chunks into page-aware sections,
 * uploads to Supabase Storage (if configured), indexes rules, and persists document metadata.
 */
documentRouter.post(
  '/documents/upload',
  uploadPdf.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new ValidationError('A valid PDF file is required for upload.')
      }

      const category = (req.body.category as DocumentCategory) || 'Tone of Voice'
      const customName = req.body.name as string | undefined
      const version = (req.body.version as string) || 'v1.0'
      const documentId = `doc-${Date.now()}`
      const originalFileName = req.file.originalname
      const displayName = customName || originalFileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')

      // 1. Extract text and pages from PDF
      const extracted = await extractPdfText(req.file.buffer)

      // 2. Page-aware semantic chunking
      const sections = chunkPageAwareText(extracted.pages, documentId)

      // 3. Count total extracted rules
      const extractedRulesCount = sections.reduce((sum, s) => sum + s.ruleCount, 0)

      // 4. Upload to Supabase Storage if configured
      let fileUrl: string | undefined
      try {
        const storageResult = await uploadToSupabaseStorage(
          env.SUPABASE_STORAGE_BUCKET,
          `guidelines/${documentId}/${originalFileName}`,
          req.file.buffer,
          'application/pdf'
        )
        if (storageResult?.publicUrl) {
          fileUrl = storageResult.publicUrl
        }
      } catch (storageErr: any) {
        console.warn('[BrandOS Storage Warning]:', storageErr.message)
      }

      // 5. Build summary
      const summary =
        extracted.text.slice(0, 220).replace(/\s+/g, ' ').trim() +
        (extracted.text.length > 220 ? '...' : '')

      const newDoc: BrandDocument = {
        id: documentId,
        workspaceId: req.workspaceId || 'ws-1',
        name: displayName,
        originalFileName,
        category,
        version,
        sizeBytes: req.file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user?.name || 'Elena Rostova',
        status: 'active',
        processingStatus: 'indexed',
        pageCount: extracted.pageCount,
        extractedRulesCount: Math.max(1, extractedRulesCount),
        summary: summary || `Brand guidelines covering ${category}.`,
        fileUrl,
        sections,
      }

      // 6. Persist document and sections
      const savedDoc = await documentRepo.createDocument(newDoc)

      // 7. Record immutable audit events
      await auditRepo.recordAuditEvent({
        actionType: 'document_uploaded',
        actor: {
          id: req.user?.id || 'usr-1',
          name: req.user?.name || 'Elena Rostova',
          email: req.user?.email || 'elena.rostova@acmehealth.com',
          role: req.user?.role || 'Brand Manager',
        },
        targetType: 'document',
        targetId: savedDoc.id,
        targetTitle: `${savedDoc.name} (${savedDoc.version})`,
        summary: `Uploaded ${savedDoc.originalFileName} (${(savedDoc.sizeBytes / (1024 * 1024)).toFixed(1)} MB)`,
        metadata: {
          category: savedDoc.category,
          version: savedDoc.version,
          pageCount: savedDoc.pageCount,
        },
      })

      await auditRepo.recordAuditEvent({
        actionType: 'document_indexed',
        actor: {
          id: 'sys-ai',
          name: 'BrandOS Indexer',
          email: 'indexer@brandos.internal',
          role: 'Automated System',
        },
        targetType: 'document',
        targetId: savedDoc.id,
        targetTitle: `${savedDoc.name} (${savedDoc.version})`,
        summary: `Indexed ${savedDoc.pageCount} pages and parsed ${savedDoc.extractedRulesCount} enforceable brand rules into knowledge base.`,
        metadata: {
          sectionsCount: savedDoc.sections.length,
          extractedRulesCount: savedDoc.extractedRulesCount,
        },
      })

      res.status(201).json(savedDoc)
    } catch (err) {
      next(err)
    }
  }
)

/**
 * PATCH /api/documents/:id/archive
 * Toggle archive/active status of guideline document
 */
documentRouter.patch(
  '/documents/:id/archive',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const updated = await documentRepo.archiveDocument(id)

      await auditRepo.recordAuditEvent({
        actionType: 'document_archived',
        actor: {
          id: req.user?.id || 'usr-1',
          name: req.user?.name || 'Elena Rostova',
          email: req.user?.email || 'elena.rostova@acmehealth.com',
          role: req.user?.role || 'Brand Manager',
        },
        targetType: 'document',
        targetId: updated.id,
        targetTitle: updated.name,
        summary: `Guideline document status changed to '${updated.status}'`,
        metadata: { newStatus: updated.status },
      })

      res.json(updated)
    } catch (err) {
      next(err)
    }
  }
)

/**
 * DELETE /api/documents/:id
 * Remove document from active registry
 */
documentRouter.delete(
  '/documents/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string
      const existing = await documentRepo.getDocumentById(id)
      const success = await documentRepo.deleteDocument(id)

      if (success) {
        await auditRepo.recordAuditEvent({
          actionType: 'document_archived',
          workspaceId: req.workspaceId || existing?.workspaceId || 'ws-1',
          actor: {
            id: req.user?.id || 'usr-1',
            name: req.user?.name || 'Elena Rostova',
            email: req.user?.email || 'elena.rostova@acmehealth.com',
            role: req.user?.role || 'Brand Manager',
          },
          targetType: 'document',
          targetId: id,
          targetTitle: existing?.name || id,
          summary: `Guideline document "${existing?.name || id}" removed from active registry.`,
          metadata: { deletedId: id, originalFileName: existing?.originalFileName },
        })
      }

      res.json({ success })
    } catch (err) {
      next(err)
    }
  }
)
