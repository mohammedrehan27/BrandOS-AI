import dotenv from 'dotenv'
import { z } from 'zod'
import { CONSTANTS } from './constants'

dotenv.config()

const envSchema = z.object({
  PORT: z
    .string()
    .optional()
    .default(String(CONSTANTS.DEFAULT_PORT))
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Gemini Configuration
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default(CONSTANTS.DEFAULT_GEMINI_MODEL),
  GEMINI_TIMEOUT_MS: z
    .string()
    .optional()
    .default('30000')
    .transform((val) => parseInt(val, 10)),

  // Supabase Configuration
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default(CONSTANTS.DEFAULT_STORAGE_BUCKET),

  // Development & Mock Isolation Flag
  ALLOW_DEV_FALLBACK: z
    .string()
    .optional()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),
})

export type EnvConfig = z.infer<typeof envSchema>

let parsedEnv: EnvConfig

try {
  parsedEnv = envSchema.parse(process.env)
} catch (err: any) {
  console.error('[Config Error] Invalid environment configuration structure:')
  if (err instanceof z.ZodError) {
    err.issues.forEach((issue) => {
      console.error(` - Field ${issue.path.join('.')}: ${issue.message}`)
    })
  }
  process.exit(1)
}

export const env = parsedEnv

export interface ServiceConfigStatus {
  gemini: {
    configured: boolean
    model: string
    missingVars: string[]
  }
  supabase: {
    configured: boolean
    hasServiceRole: boolean
    missingVars: string[]
  }
  devFallback: {
    enabled: boolean
    isProductionSafe: boolean
  }
}

export function getServiceConfigStatus(): ServiceConfigStatus {
  const geminiMissing: string[] = []
  if (!env.GEMINI_API_KEY) geminiMissing.push('GEMINI_API_KEY')

  const supabaseMissing: string[] = []
  if (!env.SUPABASE_URL) supabaseMissing.push('SUPABASE_URL')
  if (!env.SUPABASE_ANON_KEY && !env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseMissing.push('SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY')
  }

  const isGeminiConfigured = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0)
  const isSupabaseConfigured = Boolean(
    env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY)
  )

  const isDevFallbackEnabled = env.NODE_ENV !== 'production' && env.ALLOW_DEV_FALLBACK

  return {
    gemini: {
      configured: isGeminiConfigured,
      model: env.GEMINI_MODEL,
      missingVars: geminiMissing,
    },
    supabase: {
      configured: isSupabaseConfigured,
      hasServiceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      missingVars: supabaseMissing,
    },
    devFallback: {
      enabled: isDevFallbackEnabled,
      isProductionSafe: !isDevFallbackEnabled || env.NODE_ENV !== 'production',
    },
  }
}

export function logConfigReport(): void {
  const status = getServiceConfigStatus()

  console.log('----------------------------------------------------')
  console.log(`[BrandOS AI Backend] Environment: ${env.NODE_ENV.toUpperCase()}`)
  console.log(`[BrandOS AI Backend] Server Port: ${env.PORT}`)

  if (status.gemini.configured) {
    console.log(`[Gemini Provider] Status: ACTIVE (${status.gemini.model})`)
  } else {
    console.log(
      `[Gemini Provider] Status: NOT CONFIGURED (Missing: ${status.gemini.missingVars.join(', ')})`
    )
  }

  if (status.supabase.configured) {
    console.log(
      `[Supabase Database] Status: ACTIVE (Service role: ${
        status.supabase.hasServiceRole ? 'YES' : 'NO'
      })`
    )
  } else {
    console.log(
      `[Supabase Database] Status: NOT CONFIGURED (Missing: ${status.supabase.missingVars.join(', ')})`
    )
  }

  if (status.devFallback.enabled) {
    console.log(
      `[Development Fallback] Status: ENABLED (Isolated to development; safe local processing active)`
    )
  } else {
    console.log(`[Development Fallback] Status: DISABLED (Strict production mode)`)
  }
  console.log('----------------------------------------------------')
}
