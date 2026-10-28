import React, { useState, useEffect, useRef } from 'react'
import {
  BookOpen,
  Upload,
  Search,
  Filter,
  FileText,
  CheckCircle2,
  AlertCircle,
  Archive,
  Trash2,
  ExternalLink,
  ChevronRight,
  Eye,
  FileCheck,
  Sparkles,
  Layers,
  Calendar,
  User,
  Shield,
  Loader2,
} from 'lucide-react'
import { documentService } from '@/api/client'
import { BrandDocument, DocumentCategory, DocumentStatus } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Drawer } from '@/components/common/Drawer'
import { Modal } from '@/components/common/Modal'
import { formatDate, formatBytes } from '@/lib/utils'

export const BrandKnowledgePage: React.FC = () => {
  const [documents, setDocuments] = useState<BrandDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [docCategory, setDocCategory] = useState<DocumentCategory>('Clinical & Efficacy')
  const [docVersion, setDocVersion] = useState('v1.0')
  const [uploadStep, setUploadStep] = useState<
    'idle' | 'uploading' | 'chunking' | 'extracting' | 'indexing' | 'success'
  >('idle')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Selected document details drawer
  const [activeDrawerDoc, setActiveDrawerDoc] = useState<BrandDocument | null>(null)
  const [activeTab, setActiveTab] = useState<'rules' | 'preview' | 'versions'>('rules')
  const [selectedPage, setSelectedPage] = useState<number>(1)

  // Confirmation dialogs
  const [confirmArchiveDoc, setConfirmArchiveDoc] = useState<BrandDocument | null>(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<BrandDocument | null>(null)

  const categories: DocumentCategory[] = [
    'Clinical & Efficacy',
    'Legal & Regulatory',
    'Product Specifications',
    'Tone of Voice',
    'ESG & Sustainability',
    'Trademark & IP',
  ]

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const list = await documentService.getDocuments({
        search: searchQuery,
        category: selectedCategory,
        status: selectedStatus,
      })
      setDocuments(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [searchQuery, selectedCategory, selectedStatus])

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setSelectedFile(file)
      } else {
        alert('Please select a valid PDF guideline document.')
      }
    }
  }

  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleStartUpload = async () => {
    if (!selectedFile) return
    setUploadError(null)

    try {
      setUploadStep('uploading')
      await new Promise((r) => setTimeout(r, 600))

      setUploadStep('chunking')
      await new Promise((r) => setTimeout(r, 700))

      setUploadStep('extracting')
      await new Promise((r) => setTimeout(r, 800))

      setUploadStep('indexing')
      await new Promise((r) => setTimeout(r, 600))

      const newDoc = await documentService.uploadDocument(selectedFile, {
        category: docCategory,
        version: docVersion,
      })

      setUploadStep('success')
      await new Promise((r) => setTimeout(r, 500))

      setUploadModalOpen(false)
      setSelectedFile(null)
      setUploadStep('idle')
      loadDocuments()
      setActiveDrawerDoc(newDoc)
    } catch (err: any) {
      console.error('Upload failed:', err)
      setUploadError(err.message || 'Failed to upload document. Please ensure the backend server is running.')
      setUploadStep('idle')
    }
  }

  const handleToggleArchive = async (doc: BrandDocument) => {
    await documentService.archiveDocument(doc.id)
    setConfirmArchiveDoc(null)
    if (activeDrawerDoc?.id === doc.id) {
      setActiveDrawerDoc({ ...doc, status: doc.status === 'active' ? 'archived' : 'active' })
    }
    loadDocuments()
  }

  const handleDelete = async (doc: BrandDocument) => {
    await documentService.deleteDocument(doc.id)
    setConfirmDeleteDoc(null)
    if (activeDrawerDoc?.id === doc.id) {
      setActiveDrawerDoc(null)
    }
    loadDocuments()
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-[#E5E8E1] rounded-2xl p-6 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C70] mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            Approved Ground-Truth Library
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29332E] tracking-tight">
            Brand Knowledge Base
          </h1>
          <p className="text-xs sm:text-sm text-[#57635D] mt-1 max-w-2xl">
            Upload and manage authoritative corporate brand guidelines, clinical dossiers, legal standards, and product specifications used to verify marketing drafts.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setUploadModalOpen(true)}
          icon={<Upload className="w-4 h-4" />}
        >
          Upload New Guidelines
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
          {/* Search box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#7E8C84] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search guidelines by title, rules, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#29332E] placeholder-[#7E8C84] focus:outline-none focus:border-[#647C70] focus:ring-1 focus:ring-[#647C70]"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-[#57635D] shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-2.5 py-1.5 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-2.5 py-1.5 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
            >
              <option value="all">All States</option>
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Documents Grid / Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-[#E5E8E1] animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="text-center py-12">
          <BookOpen className="w-10 h-10 text-[#7E8C84] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#29332E]">No Brand Guidelines Found</h3>
          <p className="text-xs text-[#57635D] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No guideline documents matched your filter "${searchQuery}".`
              : 'Upload your company’s brand standards or clinical guidelines to activate automated claim checking.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={() => setUploadModalOpen(true)}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Upload Guidelines
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              hoverEffect
              className="flex flex-col justify-between cursor-pointer"
              onClick={() => setActiveDrawerDoc(doc)}
            >
              <div>
                {/* Top badges */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-medium text-[#4B487A] bg-[#F1F0FA] px-2 py-0.5 rounded-full border border-[#D8D6EF]">
                    {doc.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {doc.processingStatus === 'indexed' ? (
                      <span className="text-[11px] font-medium text-[#22543D] bg-[#EAF3EB] px-2 py-0.5 rounded-full border border-[#C6E1CD] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#2D6A4F]" />
                        Indexed
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-[#8C5E1A] bg-[#FAF1E1] px-2 py-0.5 rounded-full border border-[#F2DEC0] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-[#C6974F]" />
                        Processing
                      </span>
                    )}
                    {doc.status === 'archived' && (
                      <span className="text-[11px] font-medium text-[#57635D] bg-[#EFF1EC] px-2 py-0.5 rounded-full border border-[#E5E8E1]">
                        Archived
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & file name */}
                <h3 className="text-sm font-semibold text-[#29332E] line-clamp-1 hover:text-[#647C70] transition-colors">
                  {doc.name}
                </h3>
                <p className="text-[11px] text-[#7E8C84] font-mono mt-0.5 truncate">
                  {doc.originalFileName}
                </p>

                {/* Summary */}
                <p className="text-xs text-[#57635D] mt-2 line-clamp-2 leading-relaxed">
                  {doc.summary}
                </p>
              </div>

              {/* Bottom metadata */}
              <div className="pt-3 mt-4 border-t border-[#E5E8E1] flex items-center justify-between text-[11px] text-[#7E8C84]">
                <div className="flex items-center gap-3">
                  <span>{doc.version}</span>
                  <span>•</span>
                  <span>{doc.pageCount} pages</span>
                  <span>•</span>
                  <span className="text-[#647C70] font-medium">{doc.extractedRulesCount} rules</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#7E8C84] group-hover:text-[#29332E]" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Guidelines Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => {
          if (uploadStep === 'idle') setUploadModalOpen(false)
        }}
        title="Upload Brand Guideline Document"
        description="BrandOS AI will parse rules, extract enforceable passages, and generate vector indices for claim verification."
        maxWidth="xl"
      >
        <div className="space-y-4">
          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-[#647C70] bg-[#EFF3F0]'
                : selectedFile
                ? 'border-[#C2CEC7] bg-[#EFF3F0]/40'
                : 'border-[#E5E8E1] bg-[#F7F8F5] hover:border-[#D2D7CC]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0])
                }
              }}
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-[#647C70]" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-[#29332E]">{selectedFile.name}</div>
                  <div className="text-xs text-[#57635D]">{formatBytes(selectedFile.size)}</div>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-[#647C70] mx-auto mb-2" />
                <div className="text-xs font-semibold text-[#29332E]">
                  Click to select or drag and drop company guideline PDF
                </div>
                <div className="text-[11px] text-[#7E8C84] mt-1">
                  Supported format: PDF up to 25MB (Brand books, clinical dossiers, legal specs)
                </div>
              </div>
            )}
          </div>

          {/* Metadata Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-1">
                Guideline Category
              </label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
                className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-1">
                Version Identifier
              </label>
              <input
                type="text"
                value={docVersion}
                onChange={(e) => setDocVersion(e.target.value)}
                placeholder="e.g. v2.1, 2026-Q1"
                className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
              />
            </div>
          </div>

          {/* Processing Step Progress Bar */}
          {uploadStep !== 'idle' && (
            <div className="bg-[#F7F8F5] p-3.5 rounded-xl border border-[#E5E8E1] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#29332E] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#647C70]" />
                  {uploadStep === 'uploading' && 'Uploading document binary...'}
                  {uploadStep === 'chunking' && 'Deconstructing sections & extracting layout...'}
                  {uploadStep === 'extracting' && 'Parsing enforceable compliance rules...'}
                  {uploadStep === 'indexing' && 'Generating vector embeddings & citations...'}
                  {uploadStep === 'success' && 'Indexing complete! Ready for governance.'}
                </span>
                <span className="text-[11px] font-mono text-[#7E8C84]">
                  {uploadStep === 'uploading' && '25%'}
                  {uploadStep === 'chunking' && '50%'}
                  {uploadStep === 'extracting' && '75%'}
                  {uploadStep === 'indexing' && '90%'}
                  {uploadStep === 'success' && '100%'}
                </span>
              </div>
              <div className="w-full bg-[#E5E8E1] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#647C70] h-full transition-all duration-300"
                  style={{
                    width:
                      uploadStep === 'uploading'
                        ? '25%'
                        : uploadStep === 'chunking'
                        ? '50%'
                        : uploadStep === 'extracting'
                        ? '75%'
                        : uploadStep === 'indexing'
                        ? '90%'
                        : '100%',
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="bg-[#FAF1F0] p-3 rounded-xl border border-[#F5D5D3] text-xs text-[#A82B24]">
              {uploadError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E8E1]">
            <Button
              variant="outline"
              size="sm"
              disabled={uploadStep !== 'idle'}
              onClick={() => setUploadModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedFile || uploadStep !== 'idle'}
              isLoading={uploadStep !== 'idle'}
              onClick={handleStartUpload}
            >
              Start Indexing
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document Details Drawer */}
      <Drawer
        isOpen={Boolean(activeDrawerDoc)}
        onClose={() => setActiveDrawerDoc(null)}
        title={activeDrawerDoc?.name}
        description={`${activeDrawerDoc?.category} • ${activeDrawerDoc?.version}`}
        width="xl"
        footer={
          activeDrawerDoc && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmDeleteDoc(activeDrawerDoc)}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmArchiveDoc(activeDrawerDoc)}
                  icon={<Archive className="w-3.5 h-3.5" />}
                >
                  {activeDrawerDoc.status === 'active' ? 'Archive Document' : 'Unarchive Document'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveDrawerDoc(null)}
                >
                  Done
                </Button>
              </div>
            </div>
          )
        }
      >
        {activeDrawerDoc && (
          <div className="space-y-5">
            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#F7F8F5] border border-[#E5E8E1] text-xs">
              <div>
                <span className="text-[10px] text-[#7E8C84] uppercase font-semibold block">Pages</span>
                <span className="font-semibold text-[#29332E]">{activeDrawerDoc.pageCount} Pages</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7E8C84] uppercase font-semibold block">Enforceable Rules</span>
                <span className="font-semibold text-[#647C70]">{activeDrawerDoc.extractedRulesCount} Rules</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7E8C84] uppercase font-semibold block">File Size</span>
                <span className="font-semibold text-[#29332E]">{formatBytes(activeDrawerDoc.sizeBytes)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7E8C84] uppercase font-semibold block">Uploaded By</span>
                <span className="font-semibold text-[#29332E] truncate block">{activeDrawerDoc.uploadedBy}</span>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-1 border-b border-[#E5E8E1] pb-1 text-xs">
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'rules'
                    ? 'bg-[#EFF3F0] text-[#29332E] font-semibold border border-[#C2CEC7]'
                    : 'text-[#57635D] hover:bg-[#F7F8F5]'
                }`}
              >
                Extracted Rules ({activeDrawerDoc.sections.length} Sections)
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-[#EFF3F0] text-[#29332E] font-semibold border border-[#C2CEC7]'
                    : 'text-[#57635D] hover:bg-[#F7F8F5]'
                }`}
              >
                Document & Page Viewer
              </button>
              <button
                onClick={() => setActiveTab('versions')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === 'versions'
                    ? 'bg-[#EFF3F0] text-[#29332E] font-semibold border border-[#C2CEC7]'
                    : 'text-[#57635D] hover:bg-[#F7F8F5]'
                }`}
              >
                Version History
              </button>
            </div>

            {/* TAB 1: Extracted Rules */}
            {activeTab === 'rules' && (
              <div className="space-y-3">
                <p className="text-xs text-[#57635D]">
                  These are the verifiable guidelines parsed and vectorized from this document. Any marketing copy submitted in BrandOS AI is compared against these passages.
                </p>

                {activeDrawerDoc.sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-3.5 rounded-xl border border-[#E5E8E1] bg-white text-xs space-y-2 hover:border-[#D2D7CC] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#29332E]">{sec.heading}</span>
                      <span className="text-[10px] bg-[#EFF3F0] text-[#2D6A4F] px-2 py-0.5 rounded border border-[#C2CEC7]">
                        Page {sec.pageNumber} • {sec.ruleCount} Rules
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#F7F8F5] border border-[#E5E8E1] font-mono text-[11px] text-[#29332E] leading-relaxed">
                      "{sec.extractedText}"
                    </div>
                    <div className="text-[11px] text-[#57635D]">{sec.summary}</div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: PDF Page Preview Simulator */}
            {activeTab === 'preview' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs bg-[#F7F8F5] p-2 rounded-xl border border-[#E5E8E1]">
                  <span className="text-[#57635D]">
                    Viewing Page {selectedPage} of {activeDrawerDoc.pageCount}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={selectedPage <= 1}
                      onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 rounded bg-white border border-[#E5E8E1] text-xs disabled:opacity-40"
                    >
                      Prev Page
                    </button>
                    <button
                      disabled={selectedPage >= activeDrawerDoc.pageCount}
                      onClick={() => setSelectedPage((p) => Math.min(activeDrawerDoc.pageCount, p + 1))}
                      className="px-2 py-1 rounded bg-white border border-[#E5E8E1] text-xs disabled:opacity-40"
                    >
                      Next Page
                    </button>
                  </div>
                </div>

                {/* Simulated rendered PDF page */}
                <div className="bg-white border-2 border-[#E5E8E1] rounded-xl p-8 shadow-card min-h-[380px] text-xs space-y-4">
                  <div className="border-b border-[#E5E8E1] pb-3 flex items-center justify-between text-[#7E8C84]">
                    <span className="uppercase text-[10px] tracking-widest font-semibold text-[#647C70]">
                      CONFIDENTIAL • BRAND STANDARDS COMPLIANCE
                    </span>
                    <span className="text-[10px] font-mono">Page {selectedPage}</span>
                  </div>

                  <h3 className="text-base font-bold text-[#29332E]">
                    {activeDrawerDoc.sections[0]?.heading || 'Chapter 1: Efficacy & Regulatory Mandates'}
                  </h3>

                  <p className="text-[#57635D] leading-relaxed">
                    This guideline defines strict boundaries for commercial publication. All claims must undergo automated algorithmic vetting and human compliance officer approval.
                  </p>

                  <div className="bg-[#EFF3F0]/80 p-4 rounded-xl border border-[#C2CEC7] text-[#29332E] font-medium leading-relaxed">
                    <span className="text-[10px] uppercase font-bold text-[#2D6A4F] block mb-1">
                      Enforceable Policy Rule (Indexed)
                    </span>
                    {activeDrawerDoc.sections[0]?.extractedText ||
                      'All finished products must cite standardized extract levels verified by valid Certificate of Analysis.'}
                  </div>

                  <p className="text-[#57635D] text-[11px] leading-relaxed">
                    References to scientific trials must specify whether the study was conducted on healthy volunteers or diseased populations. Extrapolating in-vitro results to clinical outcomes is classified as a High-Severity contradiction.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: Version History */}
            {activeTab === 'versions' && (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl border border-[#647C70] bg-[#EFF3F0] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#29332E] flex items-center gap-1.5">
                      <span>{activeDrawerDoc.version}</span>
                      <span className="text-[10px] bg-[#647C70] text-white px-1.5 py-0.2 rounded font-medium">
                        Current Active
                      </span>
                    </div>
                    <div className="text-[11px] text-[#57635D] mt-0.5">
                      Uploaded {formatDate(activeDrawerDoc.uploadedAt)} by {activeDrawerDoc.uploadedBy}
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
                </div>

                <div className="p-3 rounded-xl border border-[#E5E8E1] bg-white flex items-center justify-between text-[#7E8C84]">
                  <div>
                    <div className="font-medium text-[#57635D]">v1.0 (Superseded)</div>
                    <div className="text-[11px] text-[#7E8C84] mt-0.5">
                      Archived on 2026-08-10 • Replaced by current version
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Confirmation Dialog: Archive */}
      <Modal
        isOpen={Boolean(confirmArchiveDoc)}
        onClose={() => setConfirmArchiveDoc(null)}
        title="Confirm Status Change"
        description="Archiving a guideline removes it from automated evaluation of new reviews, but preserves past verification citations."
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#57635D]">
            Are you sure you want to change the status of{' '}
            <strong className="text-[#29332E]">{confirmArchiveDoc?.name}</strong> to{' '}
            <span className="font-semibold">
              {confirmArchiveDoc?.status === 'active' ? 'Archived' : 'Active'}
            </span>
            ?
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmArchiveDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => confirmArchiveDoc && handleToggleArchive(confirmArchiveDoc)}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialog: Delete */}
      <Modal
        isOpen={Boolean(confirmDeleteDoc)}
        onClose={() => setConfirmDeleteDoc(null)}
        title="Confirm Permanent Deletion"
        description="This will permanently delete this guideline document from BrandOS AI."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="bg-[#F9EAEA] p-3 rounded-xl border border-[#F3C7C7] text-xs text-[#9B2C2C]">
            Warning: Any historical review finding citing this file will retain its cached citation text, but future drafts cannot be validated against it.
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => confirmDeleteDoc && handleDelete(confirmDeleteDoc)}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
