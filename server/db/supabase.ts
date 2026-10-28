import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env, getServiceConfigStatus } from '../config/env'

let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  // During unit test runs, isolate to deterministic in-memory fixtures unless testing live DB
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_LIVE_DB) {
    return null
  }

  const status = getServiceConfigStatus()
  if (!status.supabase.configured) {
    return null
  }

  if (!supabaseClient && env.SUPABASE_URL) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || ''
    supabaseClient = createClient(env.SUPABASE_URL, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return supabaseClient
}

export function isSupabaseReady(): boolean {
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_LIVE_DB) {
    return false
  }
  return getServiceConfigStatus().supabase.configured
}

export async function uploadToSupabaseStorage(
  bucket: string,
  filePath: string,
  fileBuffer: Buffer,
  contentType = 'application/pdf'
): Promise<{ path: string; publicUrl?: string } | null> {
  const client = getSupabaseClient()
  if (!client) return null

  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`)
  }

  const { data: urlData } = client.storage.from(bucket).getPublicUrl(filePath)
  return {
    path: data.path,
    publicUrl: urlData?.publicUrl,
  }
}
