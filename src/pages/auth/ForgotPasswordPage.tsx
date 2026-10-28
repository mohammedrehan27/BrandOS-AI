import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/common/Button'

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) setSubmitted(true)
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
          Reset your account password
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-[#E5E8E1] rounded-2xl shadow-subtle space-y-4">
          {submitted ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-10 h-10 text-[#2D6A4F] mx-auto" />
              <h3 className="text-sm font-semibold text-[#29332E]">Check your inbox</h3>
              <p className="text-xs text-[#57635D]">
                We have dispatched password recovery instructions to <strong>{email}</strong>.
              </p>
              <Link to="/login" className="inline-block pt-2">
                <Button variant="outline" size="sm">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#57635D]">
                Enter the email address tied to your enterprise account and we'll send a password reset link.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#29332E] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7E8C84] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-[#F7F8F5] border border-[#E5E8E1] rounded-xl pl-9 pr-3 py-2 text-xs text-[#29332E] focus:outline-none focus:border-[#647C70]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center shadow-xs"
              >
                Send Reset Link
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-[#57635D] hover:text-[#29332E]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
