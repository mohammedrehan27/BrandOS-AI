import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/lib/theme'
import { AppShell } from '@/components/layout/AppShell'
import { OverviewPage } from '@/pages/OverviewPage'
import { BrandKnowledgePage } from '@/pages/BrandKnowledgePage'
import { NewContentReviewPage } from '@/pages/NewContentReviewPage'
import { ReviewResultsPage } from '@/pages/ReviewResultsPage'
import { ReviewQueuePage } from '@/pages/ReviewQueuePage'
import { AuditTrailPage } from '@/pages/AuditTrailPage'
import { GovernanceAnalyticsPage } from '@/pages/GovernanceAnalyticsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SignInPage } from '@/pages/auth/SignInPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Authenticated Layout Shell */}
          <Route path="/" element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="knowledge" element={<BrandKnowledgePage />} />
            <Route path="review/new" element={<NewContentReviewPage />} />
            <Route path="review/:id" element={<ReviewResultsPage />} />
            <Route path="queue" element={<ReviewQueuePage />} />
            <Route path="audit" element={<AuditTrailPage />} />
            <Route path="analytics" element={<GovernanceAnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Auth routes */}
          <Route path="/login" element={<SignInPage />} />
          <Route path="/register" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Fallback */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
