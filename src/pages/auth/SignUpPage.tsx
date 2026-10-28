import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Lock, Mail, User, Building2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/common/Button'

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#F7F8F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img
            src="/brandos-emblem.png"
            alt="BrandOS AI"
            className="w-10 h-10 object-contain drop-shadow-xs"
          />
          <span className="text-xl font-bold text-[#29332E] tracking-tight">
            BrandOS <span className="text-[#647C70] text-sm font-semibold bg-[#EFF3F0] px-1.5 py-0.5 rounded border border-[#C2CEC7]">AI</span>
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-[#29332E]">
          Create your enterprise governance organization
        </h2>
        <p className="text-xs text-[#57635D] mt-1">
          Set up automated brand checking and guideline compliance.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-[#E5E8E1] rounded-2xl shadow-subtle space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7E8C84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-1">Company / Organization</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-[#7E8C84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Health Technologies"
                  className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-1">Corporate Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7E8C84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena@acmehealth.com"
                  className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7E8C84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center shadow-xs mt-2"
              isLoading={loading}
              iconRight={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Start Free Trial
            </Button>
          </form>

          <div className="text-center text-xs text-[#57635D]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#647C70] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
