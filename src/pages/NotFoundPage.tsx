import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/common/Button'

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F8F5] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#EFF3F0] text-[#647C70] border border-[#C2CEC7] flex items-center justify-center mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h1 className="text-2xl font-bold text-[#29332E]">404 — Page Not Found</h1>
      <p className="text-xs text-[#57635D] mt-1 max-w-sm">
        The governance resource or review record you are seeking does not exist or has been archived.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button variant="primary" size="md" icon={<ArrowLeft className="w-4 h-4" />}>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
