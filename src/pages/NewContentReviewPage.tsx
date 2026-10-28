import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  FileCheck,
  UploadCloud,
  FileText,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Loader2,
  Check,
} from 'lucide-react'
import { reviewService, documentService, authService } from '@/api/client'
import { BrandDocument, ContentType, Workspace } from '@/types'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'

const reviewSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  contentType: z.enum([
    'advertisement',
    'social_post',
    'landing_page',
    'email',
    'product_description',
    'press_release',
  ]),
  campaignName: z.string().optional(),
  content: z.string().min(20, 'Please enter at least 20 characters of draft copy to review'),
  guidelineDocumentIds: z.array(z.string()).min(1, 'Select at least one brand guideline document to check against'),
})

type ReviewFormData = z.infer<typeof reviewSchema>

const SAMPLE_PRESETS = [
  {
    title: 'High-Risk Efficacy Claims (Demo Contradictions)',
    contentType: 'landing_page' as ContentType,
    campaignName: 'Winter Immunity 2026',
    content: `Meet ImmunoShield Pro: the pinnacle of cellular defense. Our breakthrough formula delivers guaranteed 100% immunity against airborne pathogens within 30 minutes of consumption. Clinically proven by Mayo Clinic researchers in a double-blind peer-reviewed trial, our active complex empowers your system when you need it most. Each dose is sustainably harvested using 100% zero-carbon cold extraction technology, protecting both your health and the planet. Standardized to 45% active polyphenols and bio-fermented zinc, ImmunoShield Pro gives you unconditional peace of mind every single day.`,
  },
  {
    title: 'Compliant Structure/Function Draft (High Confidence)',
    contentType: 'email' as ContentType,
    campaignName: 'HCP Quarterly Bulletin',
    content: `We are pleased to introduce ImmunoShield Pro to your clinical practice. Standardized to 45% active polyphenols and bio-fermented zinc chelate, this formulation supports natural immune resilience and daily cellular defense in healthy adults. Evaluated in independent randomized double-blind clinical trials published in peer-reviewed scientific journals, our botanical matrix delivers consistent bioavailability. These statements have not been evaluated by the FDA and are not intended to diagnose or treat disease.`,
  },
  {
    title: 'Sustainability & Green Claims Draft (Needs Verification)',
    contentType: 'advertisement' as ContentType,
    campaignName: 'Eco-Forward Brand Campaign',
    content: `ImmunoShield Pro is packaged in completely zero-carbon cold-pressed amber glass. Our elderberries are sustainably harvested with certified carbon offset matching, ensuring 100% eco-friendly distribution across all North American retail channels. Standardized to 45% active polyphenols for pure, potent, planet-positive vitality.`,
  },
]

export const NewContentReviewPage: React.FC = () => {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<BrandDocument[]>([])
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [inputMode, setInputMode] = useState<'editor' | 'file'>('editor')
  const [analyzingModal, setAnalyzingModal] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(1)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      title: 'ImmunoShield Pro Hero & Features Landing Page Copy',
      contentType: 'landing_page',
      campaignName: 'Winter Wellness Launch 2026',
      content: SAMPLE_PRESETS[0].content,
      guidelineDocumentIds: [],
    },
  })

  const watchedContent = watch('content') || ''
  const watchedDocIds = watch('guidelineDocumentIds') || []

  const wordCount = watchedContent.trim() ? watchedContent.trim().split(/\s+/).length : 0
  const charCount = watchedContent.length

  useEffect(() => {
    const init = async () => {
      const [docs, ws] = await Promise.all([
        documentService.getDocuments({ status: 'active' }),
        authService.getCurrentWorkspace(),
      ])
      setDocuments(docs)
      setWorkspace(ws)
      // Default to all active docs
      setValue('guidelineDocumentIds', docs.map((d) => d.id))
    }
    init()
  }, [setValue])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        setValue('content', text)
        if (!watch('title') || watch('title') === 'ImmunoShield Pro Hero & Features Landing Page Copy') {
          setValue('title', file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '))
        }
      }
    }
    reader.readAsText(file)
  }

  const loadPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setValue('title', preset.title)
    setValue('contentType', preset.contentType)
    setValue('campaignName', preset.campaignName)
    setValue('content', preset.content)
  }

  const onSubmit = async (data: ReviewFormData) => {
    setAnalyzingModal(true)
    setAnalysisStep(1)

    // Animated inspection steps simulation
    await new Promise((r) => setTimeout(r, 600))
    setAnalysisStep(2) // Comparing with active guidelines

    await new Promise((r) => setTimeout(r, 700))
    setAnalysisStep(3) // Cross-referencing citations & FDA/FTC rules

    await new Promise((r) => setTimeout(r, 700))
    setAnalysisStep(4) // Formatting evidence-backed results

    await new Promise((r) => setTimeout(r, 500))

    try {
      const review = await reviewService.submitReview({
        title: data.title,
        contentType: data.contentType,
        campaignName: data.campaignName,
        content: data.content,
        guidelineDocumentIds: data.guidelineDocumentIds,
      })

      navigate(`/review/${review.id}`)
    } finally {
      setAnalyzingModal(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-[#E5E8E1] rounded-2xl p-6 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#647C70] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            AI Pre-Flight Governance Check
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#29332E] tracking-tight">
            New Content Review
          </h1>
          <p className="text-xs sm:text-sm text-[#57635D] mt-1 max-w-2xl">
            Submit marketing copy to automatically detect unverified claims, contradictory promises, and trademark violations before public distribution.
          </p>
        </div>

        {/* Quick Demo Presets */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-[11px] font-semibold text-[#7E8C84] uppercase tracking-wider">
            Demo Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => loadPreset(p)}
                className="text-[11px] bg-[#F7F8F5] hover:bg-[#EFF3F0] text-[#29332E] border border-[#E5E8E1] hover:border-[#C2CEC7] px-2.5 py-1 rounded-lg transition-colors font-medium flex items-center gap-1"
              >
                <span>Preset {idx + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Metadata Controls Card */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Draft Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#29332E] mb-1">
                Draft Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('title')}
                placeholder="e.g. ImmunoShield Pro Hero & Features Landing Page Copy"
                className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3.5 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
              />
              {errors.title && (
                <span className="text-[11px] text-[#9B2C2C] mt-1 block font-medium">
                  {errors.title.message}
                </span>
              )}
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-1">
                Content Format <span className="text-red-500">*</span>
              </label>
              <select
                {...register('contentType')}
                className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3.5 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
              >
                <option value="landing_page">Landing Page Copy</option>
                <option value="advertisement">Paid Ad / Search Copy</option>
                <option value="social_post">Social Media Carousel / Post</option>
                <option value="email">Email Outreach / Newsletter</option>
                <option value="product_description">Product Description (PDP)</option>
                <option value="press_release">Press Release / Public Statement</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#E5E8E1]">
            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-1">
                Campaign Name (Optional)
              </label>
              <input
                type="text"
                {...register('campaignName')}
                placeholder="e.g. Winter Wellness Launch 2026"
                className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3.5 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-1">
                Target Workspace
              </label>
              <div className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl px-3.5 py-2 text-xs text-[#57635D] flex items-center justify-between">
                <span>{workspace?.name || 'Acme Health Technologies'}</span>
                <span className="text-[10px] bg-white border border-[#E5E8E1] px-2 py-0.5 rounded text-[#647C70] font-medium">
                  {workspace?.industry || 'Nutraceuticals & BioTech'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Content Editor Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>Marketing Content Draft</CardTitle>
              {/* Input mode switcher */}
              <div className="flex items-center bg-[#F7F8F5] p-0.5 rounded-lg border border-[#E5E8E1] text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode('editor')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    inputMode === 'editor'
                      ? 'bg-white text-[#29332E] shadow-xs'
                      : 'text-[#57635D] hover:text-[#29332E]'
                  }`}
                >
                  Text Editor
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    inputMode === 'file'
                      ? 'bg-white text-[#29332E] shadow-xs'
                      : 'text-[#57635D] hover:text-[#29332E]'
                  }`}
                >
                  Upload File (.txt, .md)
                </button>
              </div>
            </div>

            <div className="text-xs text-[#7E8C84] flex items-center gap-3 font-mono">
              <span>{wordCount} Words</span>
              <span>•</span>
              <span>{charCount} Characters</span>
            </div>
          </CardHeader>

          {inputMode === 'file' && (
            <div className="mb-4 p-4 border border-dashed border-[#C2CEC7] rounded-xl bg-[#F7F8F5] text-center">
              <input
                type="file"
                id="file-upload"
                accept=".txt,.md,.rtf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-xs font-medium text-[#647C70] hover:underline flex items-center justify-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Click to browse and load draft copy from a text file</span>
              </label>
            </div>
          )}

          <div className="relative">
            <textarea
              {...register('content')}
              rows={8}
              placeholder="Paste or write your promotional copy, headline, social caption, or email body here..."
              className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl p-4 text-xs text-[#29332E] font-sans leading-relaxed placeholder-[#7E8C84] focus:outline-none focus:border-[#647C70] focus:bg-white transition-all resize-y"
            />
          </div>

          {errors.content && (
            <span className="text-[11px] text-[#9B2C2C] mt-2 block font-medium">
              {errors.content.message}
            </span>
          )}
        </Card>

        {/* Selected Guidelines Checklist Card */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Evaluation Guidelines</CardTitle>
              <CardDescription>
                Select which active company guidelines to cross-reference against
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-[#647C70]">
              {watchedDocIds.length} of {documents.length} Selected
            </span>
          </CardHeader>

          <Controller
            name="guidelineDocumentIds"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {documents.map((doc) => {
                  const isChecked = field.value.includes(doc.id)
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        if (isChecked) {
                          field.onChange(field.value.filter((id) => id !== doc.id))
                        } else {
                          field.onChange([...field.value, doc.id])
                        }
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked
                          ? 'border-[#647C70] bg-[#EFF3F0]/60'
                          : 'border-[#E5E8E1] bg-white hover:border-[#D2D7CC]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#647C70] border-[#647C70] text-white'
                            : 'border-[#E5E8E1] bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-[#29332E] truncate">{doc.name}</div>
                        <div className="text-[10px] text-[#7E8C84] mt-0.5">
                          {doc.category} • {doc.extractedRulesCount} Rules
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          />

          {errors.guidelineDocumentIds && (
            <span className="text-[11px] text-[#9B2C2C] mt-2 block font-medium">
              {errors.guidelineDocumentIds.message}
            </span>
          )}
        </Card>

        {/* Bottom Submission Action */}
        <div className="bg-white border border-[#E5E8E1] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#57635D] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#647C70] shrink-0" />
            <span>
              Analysis runs in real-time. Verified findings include verbatim citations and confidence metrics.
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full sm:w-auto shadow-sm"
            icon={<Sparkles className="w-4 h-4" />}
          >
            Run Brand Review
          </Button>
        </div>
      </form>

      {/* Real-time Analysis Progress Modal */}
      <Modal
        isOpen={analyzingModal}
        onClose={() => {}}
        title="Analyzing Draft Against Approved Guidelines"
        description="BrandOS AI is performing multi-layer claim verification."
        maxWidth="md"
      >
        <div className="space-y-4 py-2">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs">
              {analysisStep > 1 ? (
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-[#647C70] shrink-0" />
              )}
              <span className={analysisStep >= 1 ? 'font-semibold text-[#29332E]' : 'text-[#7E8C84]'}>
                1. Parsing marketing claims and statements of fact
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {analysisStep > 2 ? (
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] shrink-0" />
              ) : analysisStep === 2 ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#647C70] shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-[#E5E8E1] shrink-0" />
              )}
              <span className={analysisStep >= 2 ? 'font-semibold text-[#29332E]' : 'text-[#7E8C84]'}>
                2. Comparing against {watchedDocIds.length} active corporate guideline documents
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {analysisStep > 3 ? (
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] shrink-0" />
              ) : analysisStep === 3 ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#647C70] shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-[#E5E8E1] shrink-0" />
              )}
              <span className={analysisStep >= 3 ? 'font-semibold text-[#29332E]' : 'text-[#7E8C84]'}>
                3. Identifying contradictions and extracting verbatim citations
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {analysisStep >= 4 ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#647C70] shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-[#E5E8E1] shrink-0" />
              )}
              <span className={analysisStep >= 4 ? 'font-semibold text-[#29332E]' : 'text-[#7E8C84]'}>
                4. Generating suggested corrections and confidence ratings
              </span>
            </div>
          </div>

          <div className="w-full bg-[#E5E8E1] h-1.5 rounded-full overflow-hidden mt-4">
            <div
              className="bg-[#647C70] h-full transition-all duration-300"
              style={{ width: `${(analysisStep / 4) * 100}%` }}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
