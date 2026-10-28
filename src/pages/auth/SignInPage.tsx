import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Lock, Mail, ArrowRight, UserCheck, Sparkles } from 'lucide-react'
import { authService } from '@/api/client'
import { Button } from '@/components/common/Button'

export const SignInPage: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please provide your corporate email and password.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Prepared for Express auth endpoint
      await new Promise((r) => setTimeout(r, 600))
      navigate('/')
    } catch {
      setError('Authentication failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemoLogin = async (userId: string) => {
    await authService.switchUser(userId)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#F7F8F5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Logo & Wordmark */}
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
          Sign in to your brand governance portal
        </h2>
        <p className="text-xs text-[#57635D] mt-1">
          Every claim verified. Every brand protected.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-[#E5E8E1] rounded-2xl shadow-subtle space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-[#F9EAEA] border border-[#F3C7C7] text-xs text-[#9B2C2C] font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#29332E] mb-1">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7E8C84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#29332E]">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-[#647C70] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7E8C84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl pl-9 pr-9 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7E8C84] hover:text-[#29332E]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
              Sign In
            </Button>
          </form>

          {/* Quick Demo Logins for Hackathon Evaluators */}
          <div className="pt-4 border-t border-[#E5E8E1] space-y-2.5">
            <div className="text-center text-[11px] font-semibold text-[#7E8C84] uppercase tracking-wider">
              1-Click Demo Evaluation Logins:
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('usr-1')}
                className="w-full p-2.5 rounded-xl border border-[#E5E8E1] hover:border-[#647C70] hover:bg-[#EFF3F0] transition-colors text-xs text-left flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-[#29332E]">Elena Rostova</div>
                  <div className="text-[10px] text-[#57635D]">Brand Manager • Full Admin</div>
                </div>
                <span className="text-[10px] bg-[#EFF3F0] text-[#22543D] px-2 py-0.5 rounded border border-[#C2CEC7] font-medium">
                  Enter Demo →
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('usr-2')}
                className="w-full p-2.5 rounded-xl border border-[#E5E8E1] hover:border-[#7774A8] hover:bg-[#F1F0FA] transition-colors text-xs text-left flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-[#29332E]">Marcus Vance</div>
                  <div className="text-[10px] text-[#57635D]">Compliance Reviewer • Approver</div>
                </div>
                <span className="text-[10px] bg-[#F1F0FA] text-[#4B487A] px-2 py-0.5 rounded border border-[#D8D6EF] font-medium">
                  Enter Demo →
                </span>
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-[#57635D]">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-[#647C70] hover:underline">
              Create an organization account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
