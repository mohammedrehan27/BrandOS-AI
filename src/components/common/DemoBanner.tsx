import React, { useState } from 'react'
import { Sparkles, Server, RotateCcw, ChevronRight, Check } from 'lucide-react'
import { getApiConfigStatus, resetDemoData } from '@/api/client'
import { Modal } from './Modal'
import { Button } from './Button'

export const DemoBanner: React.FC = () => {
  const status = getApiConfigStatus()
  const [showModal, setShowModal] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  // Hide banner automatically when connected to the live backend
  if (!status.isDemoMode) {
    return null
  }

  const handleReset = () => {
    resetDemoData()
    setResetSuccess(true)
    setTimeout(() => {
      setResetSuccess(false)
      window.location.reload()
    }, 800)
  }

  return (
    <>
      <div className="bg-[#FAF1E1] border-b border-[#F2DEC0] px-4 py-1.5 text-xs text-[#8C5E1A] flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C6974F] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C6974F]"></span>
          </span>
          <span className="font-semibold tracking-wide uppercase text-[10px] bg-[#FAF1E1] text-[#8C5E1A] border border-[#F2DEC0] px-1.5 py-0.5 rounded">
            Interactive Hackathon Demo Mode
          </span>
          <span className="hidden md:inline text-[#8C5E1A]/80">
            Simulated Brand Governance Engine active. Ready to connect to Express backend via <code className="bg-[#FAF1E1] px-1 py-0.5 rounded border border-[#F2DEC0] font-mono text-[11px]">VITE_API_BASE_URL</code>.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="font-medium underline hover:text-[#5C3C0D] flex items-center gap-0.5 transition-colors"
          >
            <span>API Docs & Schemas</span>
            <ChevronRight className="w-3 h-3" />
          </button>
          <span className="text-[#F2DEC0] hidden sm:inline">|</span>
          <button
            onClick={handleReset}
            className="text-[11px] bg-white/70 hover:bg-white text-[#8C5E1A] border border-[#F2DEC0] px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
            title="Reset to default mock state"
          >
            {resetSuccess ? (
              <>
                <Check className="w-3 h-3 text-green-600" />
                <span>Reset!</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3 h-3" />
                <span>Reset Demo State</span>
              </>
            )}
          </button>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="BrandOS AI — Express REST API Integration Architecture"
        description="Specifications for connecting the React frontend to the Node.js/Express.js backend."
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs text-[#29332E]">
          <div className="bg-[#F7F8F5] p-3.5 rounded-xl border border-[#E5E8E1] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-[#29332E] flex items-center gap-2">
                <Server className="w-4 h-4 text-[#647C70]" />
                Current Connection Status
              </span>
              <span className="bg-[#FAF1E1] text-[#8C5E1A] border border-[#F2DEC0] px-2 py-0.5 rounded font-mono text-[11px]">
                {status.baseUrl}
              </span>
            </div>
            <p className="text-[#57635D]">
              When <code className="text-[#647C70] font-mono">VITE_API_BASE_URL</code> is defined in <code className="font-mono">.env</code>, all API requests in <code className="font-mono">src/api/client.ts</code> dynamically route to your Express REST endpoints. When unset, the fully stateful local storage mock adapter operates automatically.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 text-[#29332E]">Core Backend Endpoints Contract</h4>
            <div className="border border-[#E5E8E1] rounded-xl overflow-hidden divide-y divide-[#E5E8E1]">
              <div className="p-2.5 bg-[#F7F8F5] font-mono text-[11px] flex items-center justify-between">
                <span>POST /api/documents/upload</span>
                <span className="text-[#647C70] font-sans font-medium">Multipart PDF + Category</span>
              </div>
              <div className="p-2.5 font-mono text-[11px] flex items-center justify-between">
                <span>GET /api/documents</span>
                <span className="text-[#647C70] font-sans font-medium">List indexed guidelines</span>
              </div>
              <div className="p-2.5 bg-[#F7F8F5] font-mono text-[11px] flex items-center justify-between">
                <span>POST /api/reviews</span>
                <span className="text-[#647C70] font-sans font-medium">Submit draft & run AI analysis</span>
              </div>
              <div className="p-2.5 font-mono text-[11px] flex items-center justify-between">
                <span>POST /api/reviews/:id/decision</span>
                <span className="text-[#647C70] font-sans font-medium">Human approve/reject decision</span>
              </div>
              <div className="p-2.5 bg-[#F7F8F5] font-mono text-[11px] flex items-center justify-between">
                <span>GET /api/audit</span>
                <span className="text-[#647C70] font-sans font-medium">Chronological audit log</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setShowModal(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
