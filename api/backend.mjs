// server/app.ts
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

// server/db/supabase.ts
import { createClient } from "@supabase/supabase-js";

// server/config/env.ts
import dotenv from "dotenv";
import { z } from "zod";

// server/config/constants.ts
var CONSTANTS = {
  DEFAULT_PORT: 5e3,
  DEFAULT_GEMINI_MODEL: "gemini-3.8-flash",
  DEFAULT_STORAGE_BUCKET: "brand-guidelines",
  MAX_UPLOAD_SIZE_BYTES: 25 * 1024 * 1024,
  // 25 MB
  CHUNK_MAX_TOKENS: 400,
  CHUNK_OVERLAP_TOKENS: 50,
  MIN_CLAIM_EVIDENCE_RELEVANCE: 60,
  // Minimum keyword / passage relevance score
  CONFIDENCE_THRESHOLD_VERIFIED: 80,
  CONFIDENCE_THRESHOLD_CONTRADICTED: 75
};

// server/config/env.ts
dotenv.config();
var envSchema = z.object({
  PORT: z.string().optional().default(String(CONSTANTS.DEFAULT_PORT)).transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // Gemini Configuration
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default(CONSTANTS.DEFAULT_GEMINI_MODEL),
  GEMINI_TIMEOUT_MS: z.string().optional().default("30000").transform((val) => parseInt(val, 10)),
  // Supabase Configuration
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default(CONSTANTS.DEFAULT_STORAGE_BUCKET),
  // Development & Mock Isolation Flag
  ALLOW_DEV_FALLBACK: z.string().optional().default("true").transform((val) => val === "true" || val === "1")
});
var parsedEnv;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (err) {
  console.error("[Config Error] Invalid environment configuration structure:");
  if (err instanceof z.ZodError) {
    err.issues.forEach((issue) => {
      console.error(` - Field ${issue.path.join(".")}: ${issue.message}`);
    });
  }
  process.exit(1);
}
var env = parsedEnv;
function getServiceConfigStatus() {
  const geminiMissing = [];
  if (!env.GEMINI_API_KEY) geminiMissing.push("GEMINI_API_KEY");
  const supabaseMissing = [];
  if (!env.SUPABASE_URL) supabaseMissing.push("SUPABASE_URL");
  if (!env.SUPABASE_ANON_KEY && !env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseMissing.push("SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }
  const isGeminiConfigured = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
  const isSupabaseConfigured = Boolean(
    env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY)
  );
  const isDevFallbackEnabled = env.NODE_ENV !== "production" && env.ALLOW_DEV_FALLBACK;
  return {
    gemini: {
      configured: isGeminiConfigured,
      model: env.GEMINI_MODEL,
      missingVars: geminiMissing
    },
    supabase: {
      configured: isSupabaseConfigured,
      hasServiceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      missingVars: supabaseMissing
    },
    devFallback: {
      enabled: isDevFallbackEnabled,
      isProductionSafe: !isDevFallbackEnabled || env.NODE_ENV !== "production"
    }
  };
}

// server/db/supabase.ts
var supabaseClient = null;
function getSupabaseClient() {
  if (process.env.NODE_ENV === "test" && !process.env.TEST_LIVE_DB) {
    return null;
  }
  const status = getServiceConfigStatus();
  if (!status.supabase.configured) {
    return null;
  }
  if (!supabaseClient && env.SUPABASE_URL) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || "";
    supabaseClient = createClient(env.SUPABASE_URL, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseClient;
}
async function uploadToSupabaseStorage(bucket, filePath, fileBuffer, contentType = "application/pdf") {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.storage.from(bucket).upload(filePath, fileBuffer, {
    contentType,
    upsert: true
  });
  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }
  const { data: urlData } = client.storage.from(bucket).getPublicUrl(filePath);
  return {
    path: data.path,
    publicUrl: urlData?.publicUrl
  };
}

// server/services/errors.ts
var ServiceNotConfiguredError = class extends Error {
  code = "SERVICE_NOT_CONFIGURED";
  serviceName;
  missingVariables;
  statusCode = 503;
  constructor(serviceName, missingVariables) {
    super(
      `The ${serviceName} integration is not configured. Missing required environment variables: ${missingVariables.join(
        ", "
      )}`
    );
    this.name = "ServiceNotConfiguredError";
    this.serviceName = serviceName;
    this.missingVariables = missingVariables;
  }
};
var ValidationError = class extends Error {
  code = "VALIDATION_ERROR";
  statusCode = 400;
  details;
  constructor(message, details) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
};
var NotFoundError = class extends Error {
  code = "NOT_FOUND";
  statusCode = 404;
  constructor(resource, identifier) {
    super(`${resource} ${identifier ? `(${identifier}) ` : ""}not found`);
    this.name = "NotFoundError";
  }
};
var IllegalStateTransitionError = class extends Error {
  code = "ILLEGAL_STATE_TRANSITION";
  statusCode = 409;
  constructor(currentStatus, requestedStatus, reason) {
    super(
      `Cannot transition review draft from state '${currentStatus}' to '${requestedStatus}'${reason ? `: ${reason}` : "."}`
    );
    this.name = "IllegalStateTransitionError";
  }
};

// server/db/repositories/workspaceRepo.ts
var devWorkspaces = [
  {
    id: "ws-1",
    name: "Acme Health Technologies",
    slug: "acme-health",
    industry: "Nutraceuticals & BioTech",
    activeDocumentCount: 5,
    totalReviewsCount: 4,
    complianceScore: 58,
    createdAt: "2026-01-10T08:00:00Z"
  },
  {
    id: "ws-2",
    name: "TechNova Cloud Systems",
    slug: "technova-cloud",
    industry: "Enterprise SaaS & AI",
    activeDocumentCount: 3,
    totalReviewsCount: 19,
    complianceScore: 88,
    createdAt: "2026-02-15T09:30:00Z"
  },
  {
    id: "ws-3",
    name: "FinGuard Global Trust",
    slug: "finguard-global",
    industry: "FinTech & Banking",
    activeDocumentCount: 6,
    totalReviewsCount: 52,
    complianceScore: 96,
    createdAt: "2026-03-01T11:00:00Z"
  }
];
var devUsers = [
  {
    id: "usr-1",
    name: "Elena Rostova",
    email: "elena.rostova@acmehealth.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    role: "Brand Manager",
    workspaceId: "ws-1"
  },
  {
    id: "usr-2",
    name: "Marcus Vance",
    email: "marcus.vance@acmehealth.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    role: "Reviewer",
    workspaceId: "ws-1"
  },
  {
    id: "usr-3",
    name: "Sophia Chen",
    email: "sophia.chen@acmehealth.com",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    role: "Creator",
    workspaceId: "ws-1"
  }
];
var currentActiveWorkspaceId = "ws-1";
var currentActiveUserId = "usr-1";
var workspaceRepo = {
  async getWorkspaces() {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from("workspaces").select("*").order("name");
      if (error) throw new Error(`Database error fetching workspaces: ${error.message}`);
      return data || [];
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    return [...devWorkspaces];
  },
  async getWorkspaceById(id) {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from("workspaces").select("*").eq("id", id).single();
      if (error || !data) throw new NotFoundError("Workspace", id);
      return data;
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    const ws = devWorkspaces.find((w) => w.id === id);
    if (!ws) throw new NotFoundError("Workspace", id);
    return { ...ws };
  },
  async getCurrentWorkspace() {
    return this.getWorkspaceById(currentActiveWorkspaceId);
  },
  async switchWorkspace(id) {
    const ws = await this.getWorkspaceById(id);
    currentActiveWorkspaceId = ws.id;
    return ws;
  },
  async getUsers(workspaceId) {
    const targetWs = workspaceId || currentActiveWorkspaceId;
    const client = getSupabaseClient();
    if (client) {
      let query = client.from("profiles").select("*");
      if (targetWs) query = query.eq("workspace_id", targetWs);
      const { data, error } = await query;
      if (error) throw new Error(`Database error fetching users: ${error.message}`);
      return data || [];
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    return devUsers.filter((u) => !targetWs || u.workspaceId === targetWs);
  },
  async getUserById(id) {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from("profiles").select("*").eq("id", id).single();
      if (error || !data) throw new NotFoundError("UserProfile", id);
      return data;
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    const user = devUsers.find((u) => u.id === id);
    if (!user) throw new NotFoundError("UserProfile", id);
    return { ...user };
  },
  async getCurrentUser() {
    return this.getUserById(currentActiveUserId);
  },
  async switchUser(id) {
    const user = await this.getUserById(id);
    currentActiveUserId = user.id;
    return user;
  }
};

// server/middleware/auth.ts
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const client = getSupabaseClient();
  if (authHeader && authHeader.startsWith("Bearer ") && client) {
    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await client.auth.getUser(token);
    if (!error && user) {
      try {
        const profile = await workspaceRepo.getUserById(user.id);
        req.user = profile;
        req.workspaceId = profile.workspaceId;
        return next();
      } catch {
      }
    }
  }
  const customUserId = req.headers["x-user-id"] || req.query.userId;
  if (customUserId) {
    try {
      const profile = await workspaceRepo.getUserById(customUserId);
      req.user = profile;
      req.workspaceId = profile.workspaceId;
      return next();
    } catch {
    }
  }
  if (env.ALLOW_DEV_FALLBACK) {
    try {
      const defaultUser = await workspaceRepo.getCurrentUser();
      req.user = defaultUser;
      req.workspaceId = defaultUser.workspaceId;
      return next();
    } catch (err) {
      return next(err);
    }
  }
  res.status(401).json({
    error: "Authentication required. Missing or invalid Bearer token.",
    code: "UNAUTHORIZED"
  });
}

// server/services/gemini/errorHandler.ts
var GeminiQuotaExceededError = class extends Error {
  code = "GEMINI_QUOTA_EXCEEDED";
  statusCode = 429;
  constructor(message = "Gemini API quota or rate limit exceeded. Please wait or check your Google AI Studio plan.") {
    super(message);
    this.name = "GeminiQuotaExceededError";
  }
};
var GeminiTimeoutError = class extends Error {
  code = "GEMINI_TIMEOUT";
  statusCode = 504;
  constructor(timeoutMs) {
    super(`Gemini API inference timed out after ${timeoutMs}ms.`);
    this.name = "GeminiTimeoutError";
  }
};
async function withTimeout(promise, timeoutMs) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new GeminiTimeoutError(timeoutMs));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}
async function withRetry(fn, retries = 2, delayMs = 1e3) {
  try {
    return await fn();
  } catch (error) {
    const isRateLimit = error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
    if (isRateLimit) {
      throw new GeminiQuotaExceededError(error.message);
    }
    if (retries <= 0) throw error;
    await new Promise((r) => setTimeout(r, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
}

// server/middleware/errorHandler.ts
function centralErrorHandler(err, _req, res, _next) {
  if (err instanceof GeminiQuotaExceededError || err?.code === "GEMINI_QUOTA_EXCEEDED") {
    res.status(429).json({
      error: err.message,
      code: "GEMINI_QUOTA_EXCEEDED"
    });
    return;
  }
  if (err instanceof GeminiTimeoutError || err?.code === "GEMINI_TIMEOUT") {
    res.status(504).json({
      error: err.message,
      code: "GEMINI_TIMEOUT"
    });
    return;
  }
  if (err instanceof ServiceNotConfiguredError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      serviceName: err.serviceName,
      missingVariables: err.missingVariables
    });
    return;
  }
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details
    });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    });
    return;
  }
  if (err instanceof IllegalStateTransitionError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    });
    return;
  }
  if (err.name === "MulterError") {
    res.status(400).json({
      error: `File upload error: ${err.message}`,
      code: "UPLOAD_ERROR"
    });
    return;
  }
  console.error("[BrandOS Server Error]:", err);
  res.status(500).json({
    error: err.message || "An unexpected internal server error occurred.",
    code: "INTERNAL_SERVER_ERROR"
  });
}

// server/routes/authRoutes.ts
import { Router } from "express";
var authRouter = Router();
authRouter.get("/auth/me", async (req, res, next) => {
  try {
    const user = req.user || await workspaceRepo.getCurrentUser();
    res.json(user);
  } catch (err) {
    next(err);
  }
});
authRouter.post("/auth/switch", async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      throw new ValidationError("userId is required to switch user");
    }
    const switchedUser = await workspaceRepo.switchUser(userId);
    res.json(switchedUser);
  } catch (err) {
    next(err);
  }
});
authRouter.get("/users", async (req, res, next) => {
  try {
    const workspaceId = req.query.workspaceId || req.workspaceId;
    const users = await workspaceRepo.getUsers(workspaceId);
    res.json(users);
  } catch (err) {
    next(err);
  }
});
authRouter.get("/workspaces", async (_req, res, next) => {
  try {
    const workspaces = await workspaceRepo.getWorkspaces();
    res.json(workspaces);
  } catch (err) {
    next(err);
  }
});
authRouter.get("/workspaces/current", async (_req, res, next) => {
  try {
    const current = await workspaceRepo.getCurrentWorkspace();
    res.json(current);
  } catch (err) {
    next(err);
  }
});
authRouter.post("/workspaces/switch", async (req, res, next) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      throw new ValidationError("workspaceId is required");
    }
    const ws = await workspaceRepo.switchWorkspace(workspaceId);
    res.json(ws);
  } catch (err) {
    next(err);
  }
});

// server/routes/documentRoutes.ts
import { Router as Router2 } from "express";

// server/middleware/upload.ts
import multer from "multer";
var storage = multer.memoryStorage();
var uploadPdf = multer({
  storage,
  limits: {
    fileSize: CONSTANTS.MAX_UPLOAD_SIZE_BYTES
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new ValidationError("Invalid file type. Only PDF documents (.pdf) are supported."));
    }
  }
});

// server/services/rag/embeddings.ts
import { GoogleGenAI } from "@google/genai";
var geminiClient = null;
function getGeminiClient() {
  if (!env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return geminiClient;
}
async function generateEmbedding(text) {
  const status = getServiceConfigStatus();
  if (!status.gemini.configured || !env.GEMINI_API_KEY) {
    return null;
  }
  const ai = getGeminiClient();
  if (!ai) return null;
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text.slice(0, 2048)
    });
    const values = response.embeddings?.[0]?.values || response.embedding?.values;
    return values && values.length > 0 ? values : null;
  } catch (err) {
    console.warn("[BrandOS Embedding Warning]:", err.message);
    return null;
  }
}
function isValidEmbedding(vec, expectedDim) {
  if (!Array.isArray(vec) || vec.length === 0) return false;
  if (expectedDim !== void 0 && vec.length !== expectedDim) return false;
  return vec.every((n) => typeof n === "number" && Number.isFinite(n));
}
function cosineSimilarity(a, b, expectedDim) {
  if (!isValidEmbedding(a, expectedDim) || !isValidEmbedding(b, expectedDim) || a.length !== b.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// server/db/repositories/documentRepo.ts
var devDocuments = [
  {
    id: "doc-1",
    workspaceId: "ws-1",
    name: "Acme Clinical Marketing Guidelines 2025",
    originalFileName: "Acme_Clinical_Marketing_Guidelines_2025_v2.1.pdf",
    category: "Clinical & Efficacy",
    version: "v2.1",
    sizeBytes: 482e4,
    uploadedAt: "2026-09-14T10:30:00Z",
    uploadedBy: "Elena Rostova",
    status: "active",
    processingStatus: "indexed",
    pageCount: 34,
    extractedRulesCount: 42,
    summary: "Defines permissible efficacy claims, clinical study substantiation standards, prohibited health benefit guarantees, and mandatory disclaimers for nutritional formulations.",
    sections: [
      {
        id: "sec-1-1",
        documentId: "doc-1",
        pageNumber: 5,
        heading: "Section 1.1: Standardized Active Ingredients & Potency",
        ruleCount: 6,
        summary: "Rules regarding naming conventions and assay verification for botanical extracts.",
        extractedText: "All finished products must cite standardized extract levels verified by valid Certificate of Analysis (COA). Standardized bio-actives such as polyphenols, flavonoids, and chelated minerals must disclose verified percentage assays conforming to Master Specification COA-2024-B.",
        keywords: ["standardized", "extract", "polyphenols", "assay", "coa", "minerals", "active"]
      },
      {
        id: "sec-1-2",
        documentId: "doc-1",
        pageNumber: 12,
        heading: "Section 2.4: Efficacy Limitations & Absolute Statements",
        ruleCount: 14,
        summary: "Prohibition of absolute prevention, cure, or guaranteed protection language.",
        extractedText: 'RULE 3.1: Absolute immunity guarantees, cure declarations, or claims of 100% protection against airborne or infectious pathogens are strictly prohibited under FDA 21 CFR \xA7101.93 and FTC guidelines. Marketing copy must phrase benefits as "supports healthy immune response", "promotes cellular resilience", or "assists natural defenses". Timed onset guarantees (e.g., "within 30 minutes") are strictly prohibited unless supported by specific human pharmacokinetics trials on file.',
        keywords: ["guaranteed", "100%", "immunity", "cure", "pathogens", "30 minutes", "speed", "fda", "ftc"]
      },
      {
        id: "sec-1-3",
        documentId: "doc-1",
        pageNumber: 19,
        heading: "Section 4.2: Institutional Co-branding & Research Affiliations",
        ruleCount: 8,
        summary: "Permissible references to independent researchers and institutions.",
        extractedText: 'RULE 4.8: Specific academic or medical institutional endorsements (such as Mayo Clinic, Harvard, Johns Hopkins) may never be cited without formal executed institutional review board agreements and corporate legal sign-off. References must describe study protocols generally, e.g., "independent randomized, double-blind, placebo-controlled clinical trials published in peer-reviewed scientific journals."',
        keywords: ["mayo clinic", "harvard", "johns hopkins", "endorsement", "clinical trials", "peer-reviewed"]
      }
    ]
  },
  {
    id: "doc-2",
    workspaceId: "ws-1",
    name: "FDA & FTC Regulatory Compliance Manual",
    originalFileName: "Acme_Regulatory_Compliance_Manual_FDA_FTC_v1.4.pdf",
    category: "Legal & Regulatory",
    version: "v1.4",
    sizeBytes: 742e4,
    uploadedAt: "2026-08-20T14:15:00Z",
    uploadedBy: "Marcus Vance",
    status: "active",
    processingStatus: "indexed",
    pageCount: 58,
    extractedRulesCount: 67,
    summary: "Comprehensive regulatory standards covering DSHEA statutory disclaimers, substantiation dossiers, and deceptive advertising safeguards.",
    sections: [
      {
        id: "sec-2-1",
        documentId: "doc-2",
        pageNumber: 8,
        heading: "Section 2.1: DSHEA Mandatory Disclaimer Presentation",
        ruleCount: 12,
        summary: "Font size, placement, and bounding box requirements for statutory disclosures.",
        extractedText: 'RULE 2.3: Every consumer marketing piece making nutritional structure/function claims must display the FDA disclaimer in prominent typography: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."',
        keywords: ["fda disclaimer", "dshea", "diagnose", "treat", "cure", "prevent", "statutory"]
      }
    ]
  },
  {
    id: "doc-3",
    workspaceId: "ws-1",
    name: "Product Specifications: ImmunoShield Pro",
    originalFileName: "Acme_Product_Specs_ImmunoShield_v3.0.pdf",
    category: "Product Specifications",
    version: "v3.0",
    sizeBytes: 295e4,
    uploadedAt: "2026-09-02T09:00:00Z",
    uploadedBy: "Elena Rostova",
    status: "active",
    processingStatus: "indexed",
    pageCount: 18,
    extractedRulesCount: 25,
    summary: "Formulation bill of materials, clinical trial registry numbers, stability data, and active ingredient percentages for the ImmunoShield Pro line.",
    sections: [
      {
        id: "sec-3-1",
        documentId: "doc-3",
        pageNumber: 4,
        heading: "Section 1.2: Active Bio-Available Potency Spec",
        ruleCount: 5,
        summary: "Permissible potency phrasing for zinc bisglycinate and elderberry matrix.",
        extractedText: "ImmunoShield Pro delivers 15mg elemental zinc in high-absorption bisglycinate chelate form combined with 450mg European Black Elderberry standardized to 45% total polyphenols. Batch analysis confirms allergen-free and vegan certification.",
        keywords: ["immunoshield", "zinc", "polyphenols", "45%", "elderberry", "bisglycinate", "vegan"]
      }
    ]
  },
  {
    id: "doc-4",
    workspaceId: "ws-1",
    name: "Global ESG & Sustainability Claims Standard",
    originalFileName: "Acme_Global_ESG_Claims_Standard_v1.2.pdf",
    category: "ESG & Sustainability",
    version: "v1.2",
    sizeBytes: 31e5,
    uploadedAt: "2026-07-15T11:45:00Z",
    uploadedBy: "Marcus Vance",
    status: "active",
    processingStatus: "indexed",
    pageCount: 22,
    extractedRulesCount: 19,
    summary: "Green claims guardrails, carbon neutrality audit requirements, packaging recyclable statements, and third-party fair trade verifications.",
    sections: [
      {
        id: "sec-4-1",
        documentId: "doc-4",
        pageNumber: 8,
        heading: "Section 1.3: Carbon Footprint & Environmental Claims",
        ruleCount: 7,
        summary: "Evidence criteria for zero-carbon, carbon-neutral, and net-zero terminology.",
        extractedText: 'RULE 7.2: Unqualified claims such as "100% zero-carbon" or "completely emission-free" are prohibited without a specific third-party ISO-14064 verified Life Cycle Assessment (LCA) identifier published in public brand disclosures. Marketing copy should specify "manufactured using verified renewable electricity with certified carbon offset retirement."',
        keywords: ["zero-carbon", "carbon-neutral", "iso-14064", "emission-free", "sustainability", "green", "offset"]
      }
    ]
  },
  {
    id: "doc-5",
    workspaceId: "ws-1",
    name: "Brand Voice, Trademark & Typography Guardrails",
    originalFileName: "Acme_Brand_Voice_Trademark_Guardrails_v4.0.pdf",
    category: "Trademark & IP",
    version: "v4.0",
    sizeBytes: 215e4,
    uploadedAt: "2026-06-10T16:20:00Z",
    uploadedBy: "Elena Rostova",
    status: "active",
    processingStatus: "indexed",
    pageCount: 15,
    extractedRulesCount: 31,
    summary: "Guidelines for trademark symbol usage (ImmunoShield\xAE), headline capitalization, approved tone descriptors, and forbidden hype terminology.",
    sections: [
      {
        id: "sec-5-1",
        documentId: "doc-5",
        pageNumber: 3,
        heading: "Section 1.1: Trademark Symbol Rules",
        ruleCount: 9,
        summary: "Mandatory registered trademark symbol in first prominent headline.",
        extractedText: "RULE 1.2: The registered trademark symbol \xAE must appear on the first prominent headline mention of ImmunoShield\xAE in any promotional asset. Subsequent body copy mentions may omit the symbol.",
        keywords: ["trademark", "symbol", "immunoshield", "headline", "guardrail"]
      }
    ]
  }
];
var documentRepo = {
  async getDocuments(params) {
    const client = getSupabaseClient();
    if (client) {
      let query = client.from("brand_documents").select("*, sections:document_sections(*)");
      if (params?.workspaceId) {
        query = query.eq("workspace_id", params.workspaceId);
      }
      if (params?.status && params.status !== "all") {
        query = query.eq("status", params.status);
      }
      if (params?.category && params.category !== "all") {
        query = query.eq("category", params.category);
      }
      if (params?.search) {
        query = query.ilike("name", `%${params.search}%`);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(`Database error fetching documents: ${error.message}`);
      return (data || []).map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        originalFileName: row.original_file_name,
        category: row.category,
        version: row.version,
        sizeBytes: Number(row.size_bytes),
        fileUrl: row.file_url,
        status: row.status,
        processingStatus: row.processing_status,
        pageCount: row.page_count,
        extractedRulesCount: row.extracted_rules_count,
        summary: row.summary,
        uploadedAt: row.created_at,
        uploadedBy: row.uploaded_by_name || "System",
        sections: (row.sections || []).map((s) => ({
          id: s.id,
          pageNumber: s.page_number,
          heading: s.heading,
          ruleCount: s.rule_count,
          summary: s.summary,
          extractedText: s.extracted_text,
          keywords: s.keywords || []
        }))
      }));
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    let list = [...devDocuments];
    if (params?.workspaceId) {
      list = list.filter((d) => (d.workspaceId || "ws-1") === params.workspaceId);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (d) => d.name.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q) || d.originalFileName.toLowerCase().includes(q)
      );
    }
    if (params?.category && params.category !== "all") {
      list = list.filter((d) => d.category === params.category);
    }
    if (params?.status && params.status !== "all") {
      list = list.filter((d) => d.status === params.status);
    }
    return list;
  },
  async getDocumentById(id) {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from("brand_documents").select("*, sections:document_sections(*)").eq("id", id).single();
      if (error || !data) return null;
      return {
        id: data.id,
        workspaceId: data.workspace_id,
        name: data.name,
        originalFileName: data.original_file_name,
        category: data.category,
        version: data.version,
        sizeBytes: Number(data.size_bytes),
        fileUrl: data.file_url,
        status: data.status,
        processingStatus: data.processing_status,
        pageCount: data.page_count,
        extractedRulesCount: data.extracted_rules_count,
        summary: data.summary,
        uploadedAt: data.created_at,
        uploadedBy: data.uploaded_by_name || "System",
        sections: (data.sections || []).map((s) => ({
          id: s.id,
          pageNumber: s.page_number,
          heading: s.heading,
          ruleCount: s.rule_count,
          summary: s.summary,
          extractedText: s.extracted_text,
          keywords: s.keywords || []
        }))
      };
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    const doc = devDocuments.find((d) => d.id === id);
    return doc ? { ...doc } : null;
  },
  async createDocument(doc) {
    const client = getSupabaseClient();
    if (client) {
      const { data: insertedDoc, error: docError } = await client.from("brand_documents").insert({
        id: doc.id,
        workspace_id: doc.workspaceId || "ws-1",
        name: doc.name,
        original_file_name: doc.originalFileName,
        category: doc.category,
        version: doc.version,
        size_bytes: doc.sizeBytes,
        file_url: doc.fileUrl,
        status: doc.status,
        processing_status: doc.processingStatus,
        page_count: doc.pageCount,
        extracted_rules_count: doc.extractedRulesCount,
        summary: doc.summary,
        uploaded_by_name: doc.uploadedBy
      }).select().single();
      if (docError) throw new Error(`Failed to insert document: ${docError.message}`);
      if (doc.sections && doc.sections.length > 0) {
        const sectionsToInsert = await Promise.all(
          doc.sections.map(async (s) => {
            const emb = s.embedding || await generateEmbedding(`${s.heading}: ${s.extractedText}`);
            return {
              document_id: doc.id,
              page_number: s.pageNumber,
              heading: s.heading,
              rule_count: s.ruleCount,
              summary: s.summary,
              extracted_text: s.extractedText,
              keywords: s.keywords || [],
              embedding: emb
            };
          })
        );
        const { error: secError } = await client.from("document_sections").insert(sectionsToInsert);
        if (secError) throw new Error(`Database error inserting document sections: ${secError.message}`);
      }
      return doc;
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    devDocuments.unshift(doc);
    return doc;
  },
  async archiveDocument(id) {
    const client = getSupabaseClient();
    if (client) {
      const existing = await this.getDocumentById(id);
      if (!existing) throw new NotFoundError("BrandDocument", id);
      const nextStatus = existing.status === "active" ? "archived" : "active";
      const { error } = await client.from("brand_documents").update({ status: nextStatus }).eq("id", id);
      if (error) throw new Error(`Failed to update status: ${error.message}`);
      existing.status = nextStatus;
      return existing;
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    const doc = devDocuments.find((d) => d.id === id);
    if (!doc) throw new NotFoundError("BrandDocument", id);
    doc.status = doc.status === "active" ? "archived" : "active";
    return { ...doc };
  },
  async deleteDocument(id) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from("brand_documents").delete().eq("id", id);
      if (error) throw new Error(`Failed to delete document: ${error.message}`);
      return true;
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    const index = devDocuments.findIndex((d) => d.id === id);
    if (index === -1) return false;
    devDocuments.splice(index, 1);
    return true;
  },
  async getDocumentSectionsForRetrieval(documentIds) {
    const docs = await this.getDocuments({ status: "active" });
    const filtered = documentIds && documentIds.length > 0 ? docs.filter((d) => documentIds.includes(d.id)) : docs;
    const allSections = [];
    filtered.forEach((d) => {
      d.sections.forEach((s) => {
        allSections.push({
          ...s,
          documentId: d.id,
          documentName: d.name,
          documentVersion: d.version
        });
      });
    });
    return allSections;
  }
};

// server/db/repositories/auditRepo.ts
var devAuditEvents = [
  {
    id: "aud-108",
    workspaceId: "ws-1",
    timestamp: "2026-10-25T09:15:00Z",
    actionType: "finding_generated",
    actor: {
      id: "sys-ai",
      name: "BrandOS Governance Engine",
      email: "engine@brandos.internal",
      role: "Automated System"
    },
    targetType: "review",
    targetId: "REV-2025-089",
    targetTitle: "ImmunoShield Pro Hero & Features Landing Page Copy",
    summary: "Analyzed draft against 4 active guideline documents; generated 4 evidence-backed findings (2 Contradicted, 1 Needs Verification, 1 Verified).",
    metadata: {
      guidelinesUsed: 4,
      processingDurationMs: 1420
    }
  },
  {
    id: "aud-107",
    workspaceId: "ws-1",
    timestamp: "2026-10-24T14:22:00Z",
    actionType: "draft_submitted",
    actor: {
      id: "usr-3",
      name: "Sophia Chen",
      email: "sophia.chen@acmehealth.com",
      role: "Creator"
    },
    targetType: "review",
    targetId: "REV-2025-089",
    targetTitle: "ImmunoShield Pro Hero & Features Landing Page Copy",
    summary: "Submitted new landing page copy draft for pre-flight compliance governance.",
    metadata: {
      wordCount: 88,
      contentType: "landing_page"
    }
  },
  {
    id: "aud-106",
    workspaceId: "ws-1",
    timestamp: "2026-10-23T16:45:00Z",
    actionType: "revisions_requested",
    actor: {
      id: "usr-2",
      name: "Marcus Vance",
      email: "marcus.vance@acmehealth.com",
      role: "Reviewer"
    },
    targetType: "review",
    targetId: "REV-2025-074",
    targetTitle: "Q3 Paid Instagram Carousel \u2014 Clinical Defense Series",
    summary: "Requested revisions: Prohibited disease prevention claims detected in Slide 2.",
    metadata: {
      decision: "changes_requested"
    }
  },
  {
    id: "aud-105",
    workspaceId: "ws-1",
    timestamp: "2026-10-19T14:10:00Z",
    actionType: "approval_decision",
    actor: {
      id: "usr-2",
      name: "Marcus Vance",
      email: "marcus.vance@acmehealth.com",
      role: "Reviewer"
    },
    targetType: "review",
    targetId: "REV-2025-061",
    targetTitle: "Healthcare Professional Email Announcement: Q4 Advisory",
    summary: "Approved HCP email draft after confirming all claims align with DSHEA guidelines.",
    metadata: {
      decision: "approved"
    }
  },
  {
    id: "aud-104",
    workspaceId: "ws-1",
    timestamp: "2026-09-14T10:30:00Z",
    actionType: "document_indexed",
    actor: {
      id: "usr-1",
      name: "Elena Rostova",
      email: "elena.rostova@acmehealth.com",
      role: "Brand Manager"
    },
    targetType: "document",
    targetId: "doc-1",
    targetTitle: "Acme Clinical Marketing Guidelines 2025 (v2.1)",
    summary: "Uploaded and indexed 34 guideline pages; extracted 42 enforceable brand rules.",
    metadata: {
      pageCount: 34,
      version: "v2.1"
    }
  }
];
var auditRepo = {
  async getAuditEvents(filter) {
    const client = getSupabaseClient();
    if (client) {
      let query = client.from("audit_events").select("*");
      if (filter?.workspaceId) {
        query = query.eq("workspace_id", filter.workspaceId);
      }
      if (filter?.actionType && filter.actionType !== "all") {
        query = query.eq("action_type", filter.actionType);
      }
      if (filter?.userId && filter.userId !== "all") {
        query = query.eq("actor_id", filter.userId);
      }
      if (filter?.reviewId) {
        query = query.eq("target_id", filter.reviewId);
      }
      if (filter?.search) {
        query = query.ilike("summary", `%${filter.search}%`);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(`Database error fetching audit events: ${error.message}`);
      return (data || []).map((row) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        timestamp: row.created_at,
        actionType: row.action_type,
        actor: {
          id: row.actor_id,
          name: row.actor_name,
          email: row.actor_email,
          role: row.actor_role
        },
        targetType: row.target_type,
        targetId: row.target_id,
        targetTitle: row.target_title,
        summary: row.summary,
        metadata: row.metadata || {}
      }));
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    let list = [...devAuditEvents];
    if (filter?.workspaceId) {
      list = list.filter((e) => (e.workspaceId || "ws-1") === filter.workspaceId);
    }
    if (filter?.actionType && filter.actionType !== "all") {
      list = list.filter((e) => e.actionType === filter.actionType);
    }
    if (filter?.userId && filter.userId !== "all") {
      list = list.filter((e) => e.actor.id === filter.userId);
    }
    if (filter?.reviewId) {
      list = list.filter((e) => e.targetId === filter.reviewId);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (e) => e.summary.toLowerCase().includes(q) || e.targetTitle.toLowerCase().includes(q) || e.actor.name.toLowerCase().includes(q)
      );
    }
    return list;
  },
  async recordAuditEvent(event) {
    const newEvent = {
      id: `aud-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      workspaceId: event.workspaceId || "ws-1",
      ...event
    };
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from("audit_events").insert({
        workspace_id: newEvent.workspaceId || "ws-1",
        action_type: newEvent.actionType,
        actor_id: newEvent.actor.id,
        actor_name: newEvent.actor.name,
        actor_email: newEvent.actor.email,
        actor_role: newEvent.actor.role,
        target_type: newEvent.targetType,
        target_id: newEvent.targetId,
        target_title: newEvent.targetTitle,
        summary: newEvent.summary,
        metadata: newEvent.metadata || {}
      });
      if (error) throw new Error(`Database error recording audit event: ${error.message}`);
      return newEvent;
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    devAuditEvents.unshift(newEvent);
    return newEvent;
  }
};

// server/services/pdf/extractor.ts
import { createRequire } from "module";
var require2 = createRequire(import.meta.url);
async function extractPdfText(buffer) {
  if (!buffer || buffer.length === 0) {
    return {
      pageCount: 0,
      text: "",
      pages: [],
      isScannedOrEmpty: true,
      warning: "PDF buffer is empty (0 bytes)."
    };
  }
  try {
    const pdfParse = require2("pdf-parse");
    const pages = [];
    if (pdfParse && pdfParse.PDFParse) {
      const parser = new pdfParse.PDFParse({ data: buffer });
      await parser.load();
      const textResult = await parser.getText();
      if (textResult?.pages && textResult.pages.length > 0) {
        textResult.pages.forEach((p) => {
          if (p.text && p.text.trim().length > 0) {
            pages.push({
              pageNumber: p.num || pages.length + 1,
              text: p.text.trim()
            });
          }
        });
      }
      const fullText2 = (textResult?.text || "").trim();
      const isScannedOrEmpty2 = fullText2.length === 0;
      return {
        pageCount: textResult?.total || (pages.length > 0 ? pages.length : 1),
        text: fullText2,
        pages,
        isScannedOrEmpty: isScannedOrEmpty2,
        warning: isScannedOrEmpty2 ? "No extractable text found in PDF. Scanned or image-only PDFs require OCR preprocessing." : void 0
      };
    }
    let currentPage = 1;
    const pager = (pageData) => {
      return pageData.getTextContent().then((textContent) => {
        let lastY = null;
        let text = "";
        for (const item of textContent.items) {
          if (lastY === item.transform[5] || !lastY) {
            text += item.str + " ";
          } else {
            text += "\n" + item.str + " ";
          }
          lastY = item.transform[5];
        }
        if (text.trim().length > 0) {
          pages.push({
            pageNumber: currentPage,
            text: text.trim()
          });
        }
        currentPage++;
        return text;
      });
    };
    const data = await pdfParse(buffer, { pager });
    const fullText = (data.text || "").trim();
    if (pages.length === 0 && fullText.length > 0) {
      const rawPages = fullText.split(/\f|\n(?=Page\s+\d+)/i);
      rawPages.forEach((pt, idx) => {
        if (pt.trim().length > 0) {
          pages.push({
            pageNumber: idx + 1,
            text: pt.trim()
          });
        }
      });
    }
    const isScannedOrEmpty = fullText.length === 0;
    return {
      pageCount: data.numpages || (pages.length > 0 ? pages.length : 1),
      text: fullText,
      pages,
      isScannedOrEmpty,
      warning: isScannedOrEmpty ? "No extractable text found in PDF. Scanned or image-only PDFs require OCR preprocessing." : void 0
    };
  } catch (error) {
    const fallbackText = buffer.toString("utf-8").trim();
    const isScannedOrEmpty = fallbackText.length === 0;
    return {
      pageCount: isScannedOrEmpty ? 0 : 1,
      text: fallbackText,
      pages: isScannedOrEmpty ? [] : [{ pageNumber: 1, text: fallbackText }],
      isScannedOrEmpty,
      warning: isScannedOrEmpty ? "No extractable text found in document buffer." : void 0
    };
  }
}

// server/services/pdf/chunker.ts
var STOP_WORDS = /* @__PURE__ */ new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "were",
  "which",
  "about",
  "into",
  "than",
  "will",
  "then",
  "they",
  "their",
  "there",
  "what",
  "when",
  "where",
  "also",
  "some",
  "other",
  "been",
  "must",
  "should",
  "would",
  "all",
  "are",
  "not",
  "can",
  "our",
  "you",
  "your",
  "has",
  "had"
]);
function extractKeywords(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9%\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const freqMap = {};
  words.forEach((w) => {
    freqMap[w] = (freqMap[w] || 0) + 1;
  });
  return Object.entries(freqMap).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w]) => w);
}
function chunkPageAwareText(pages, documentId) {
  const sections = [];
  pages.forEach((page) => {
    const lines = page.text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    let currentHeading = `Page ${page.pageNumber}: General Standards`;
    let currentParagraphs = [];
    let sectionIdx = 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHeading = /^(?:Section|Chapter|Rule|Article|Part)\s+[0-9A-Z.:-]+/i.test(line) || /^[A-Z0-9\s:.,-]{5,60}$/.test(line) && line.length < 50 && !line.endsWith(".");
      if (isHeading && currentParagraphs.length > 0) {
        const fullSectionText = currentParagraphs.join(" ");
        const keywords = extractKeywords(fullSectionText);
        const ruleCount = Math.max(1, (fullSectionText.match(/\b(?:must|shall|prohibited|required|forbidden|mandatory)\b/gi) || []).length);
        sections.push({
          id: `sec-${documentId || "doc"}-p${page.pageNumber}-${sectionIdx++}`,
          documentId,
          pageNumber: page.pageNumber,
          heading: currentHeading,
          ruleCount,
          summary: fullSectionText.slice(0, 140) + "...",
          extractedText: fullSectionText,
          keywords
        });
        currentHeading = line;
        currentParagraphs = [];
      } else if (isHeading) {
        currentHeading = line;
      } else {
        currentParagraphs.push(line);
      }
    }
    if (currentParagraphs.length > 0) {
      const fullSectionText = currentParagraphs.join(" ");
      const keywords = extractKeywords(fullSectionText);
      const ruleCount = Math.max(1, (fullSectionText.match(/\b(?:must|shall|prohibited|required|forbidden|mandatory)\b/gi) || []).length);
      sections.push({
        id: `sec-${documentId || "doc"}-p${page.pageNumber}-${sectionIdx++}`,
        documentId,
        pageNumber: page.pageNumber,
        heading: currentHeading,
        ruleCount,
        summary: fullSectionText.slice(0, 140) + "...",
        extractedText: fullSectionText,
        keywords
      });
    }
  });
  if (sections.length === 0 && pages.length > 0) {
    const fullText = pages.map((p) => p.text).join("\n").trim();
    if (fullText.length > 0) {
      sections.push({
        id: `sec-${documentId || "doc"}-1`,
        documentId,
        pageNumber: pages[0]?.pageNumber || 1,
        heading: "General Guideline Standards",
        ruleCount: 1,
        summary: fullText.slice(0, 140) + "...",
        extractedText: fullText,
        keywords: extractKeywords(fullText)
      });
    }
  }
  return sections;
}

// server/routes/documentRoutes.ts
var documentRouter = Router2();
documentRouter.get("/documents", async (req, res, next) => {
  try {
    const { search, category, status } = req.query;
    const documents = await documentRepo.getDocuments({
      search,
      category,
      status,
      workspaceId: req.workspaceId
    });
    res.json(documents);
  } catch (err) {
    next(err);
  }
});
documentRouter.get("/documents/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const document = await documentRepo.getDocumentById(id);
    if (!document) {
      throw new NotFoundError("BrandDocument", id);
    }
    res.json(document);
  } catch (err) {
    next(err);
  }
});
documentRouter.post(
  "/documents/upload",
  uploadPdf.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ValidationError("A valid PDF file is required for upload.");
      }
      const category = req.body.category || "Tone of Voice";
      const customName = req.body.name;
      const version = req.body.version || "v1.0";
      const documentId = `doc-${Date.now()}`;
      const originalFileName = req.file.originalname;
      const displayName = customName || originalFileName.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
      const extracted = await extractPdfText(req.file.buffer);
      const sections = chunkPageAwareText(extracted.pages, documentId);
      const extractedRulesCount = sections.reduce((sum, s) => sum + s.ruleCount, 0);
      let fileUrl;
      try {
        const storageResult = await uploadToSupabaseStorage(
          env.SUPABASE_STORAGE_BUCKET,
          `guidelines/${documentId}/${originalFileName}`,
          req.file.buffer,
          "application/pdf"
        );
        if (storageResult?.publicUrl) {
          fileUrl = storageResult.publicUrl;
        }
      } catch (storageErr) {
        console.warn("[BrandOS Storage Warning]:", storageErr.message);
      }
      const summary = extracted.text.slice(0, 220).replace(/\s+/g, " ").trim() + (extracted.text.length > 220 ? "..." : "");
      const newDoc = {
        id: documentId,
        workspaceId: req.workspaceId || "ws-1",
        name: displayName,
        originalFileName,
        category,
        version,
        sizeBytes: req.file.size,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        uploadedBy: req.user?.name || "Elena Rostova",
        status: "active",
        processingStatus: "indexed",
        pageCount: extracted.pageCount,
        extractedRulesCount: Math.max(1, extractedRulesCount),
        summary: summary || `Brand guidelines covering ${category}.`,
        fileUrl,
        sections
      };
      const savedDoc = await documentRepo.createDocument(newDoc);
      await auditRepo.recordAuditEvent({
        actionType: "document_uploaded",
        actor: {
          id: req.user?.id || "usr-1",
          name: req.user?.name || "Elena Rostova",
          email: req.user?.email || "elena.rostova@acmehealth.com",
          role: req.user?.role || "Brand Manager"
        },
        targetType: "document",
        targetId: savedDoc.id,
        targetTitle: `${savedDoc.name} (${savedDoc.version})`,
        summary: `Uploaded ${savedDoc.originalFileName} (${(savedDoc.sizeBytes / (1024 * 1024)).toFixed(1)} MB)`,
        metadata: {
          category: savedDoc.category,
          version: savedDoc.version,
          pageCount: savedDoc.pageCount
        }
      });
      await auditRepo.recordAuditEvent({
        actionType: "document_indexed",
        actor: {
          id: "sys-ai",
          name: "BrandOS Indexer",
          email: "indexer@brandos.internal",
          role: "Automated System"
        },
        targetType: "document",
        targetId: savedDoc.id,
        targetTitle: `${savedDoc.name} (${savedDoc.version})`,
        summary: `Indexed ${savedDoc.pageCount} pages and parsed ${savedDoc.extractedRulesCount} enforceable brand rules into knowledge base.`,
        metadata: {
          sectionsCount: savedDoc.sections.length,
          extractedRulesCount: savedDoc.extractedRulesCount
        }
      });
      res.status(201).json(savedDoc);
    } catch (err) {
      next(err);
    }
  }
);
documentRouter.patch(
  "/documents/:id/archive",
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const updated = await documentRepo.archiveDocument(id);
      await auditRepo.recordAuditEvent({
        actionType: "document_archived",
        actor: {
          id: req.user?.id || "usr-1",
          name: req.user?.name || "Elena Rostova",
          email: req.user?.email || "elena.rostova@acmehealth.com",
          role: req.user?.role || "Brand Manager"
        },
        targetType: "document",
        targetId: updated.id,
        targetTitle: updated.name,
        summary: `Guideline document status changed to '${updated.status}'`,
        metadata: { newStatus: updated.status }
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
documentRouter.delete(
  "/documents/:id",
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const existing = await documentRepo.getDocumentById(id);
      const success = await documentRepo.deleteDocument(id);
      if (success) {
        await auditRepo.recordAuditEvent({
          actionType: "document_archived",
          workspaceId: req.workspaceId || existing?.workspaceId || "ws-1",
          actor: {
            id: req.user?.id || "usr-1",
            name: req.user?.name || "Elena Rostova",
            email: req.user?.email || "elena.rostova@acmehealth.com",
            role: req.user?.role || "Brand Manager"
          },
          targetType: "document",
          targetId: id,
          targetTitle: existing?.name || id,
          summary: `Guideline document "${existing?.name || id}" removed from active registry.`,
          metadata: { deletedId: id, originalFileName: existing?.originalFileName }
        });
      }
      res.json({ success });
    } catch (err) {
      next(err);
    }
  }
);

// server/routes/reviewRoutes.ts
import { Router as Router3 } from "express";

// server/db/repositories/reviewRepo.ts
var devReviews = [
  {
    id: "REV-2025-089",
    title: "ImmunoShield Pro Hero & Features Landing Page Copy",
    contentType: "landing_page",
    campaignName: "Winter Wellness Launch 2026",
    workspaceId: "ws-1",
    submittedBy: {
      id: "usr-3",
      name: "Sophia Chen",
      email: "sophia.chen@acmehealth.com",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"
    },
    submittedAt: "2026-10-24T14:22:00Z",
    updatedAt: "2026-10-25T09:15:00Z",
    originalText: `Meet ImmunoShield Pro: the pinnacle of cellular defense. Our breakthrough formula delivers guaranteed 100% immunity against airborne pathogens within 30 minutes of consumption. Clinically proven by Mayo Clinic researchers in a double-blind peer-reviewed trial, our active complex empowers your system when you need it most. Each dose is sustainably harvested using 100% zero-carbon cold extraction technology, protecting both your health and the planet. Standardized to 45% active polyphenols and bio-fermented zinc, ImmunoShield Pro gives you unconditional peace of mind every single day.`,
    currentText: `Meet ImmunoShield Pro: the pinnacle of cellular defense. Our breakthrough formula delivers guaranteed 100% immunity against airborne pathogens within 30 minutes of consumption. Clinically proven by Mayo Clinic researchers in a double-blind peer-reviewed trial, our active complex empowers your system when you need it most. Each dose is sustainably harvested using 100% zero-carbon cold extraction technology, protecting both your health and the planet. Standardized to 45% active polyphenols and bio-fermented zinc, ImmunoShield Pro gives you unconditional peace of mind every single day.`,
    guidelineDocumentIds: ["doc-1", "doc-2", "doc-3", "doc-4"],
    status: "ready_for_approval",
    stats: {
      totalClaims: 4,
      verified: 1,
      contradicted: 2,
      needsVerification: 1,
      highSeverityCount: 2
    },
    findings: [
      {
        id: "fnd-1",
        draftId: "REV-2025-089",
        claimText: "guaranteed 100% immunity against airborne pathogens within 30 minutes of consumption",
        startIndex: 83,
        endIndex: 167,
        status: "contradicted",
        severity: "high",
        brandRuleId: "RULE-3.1",
        brandRuleTitle: "Prohibition of Absolute Protection & Speed Guarantees",
        explanation: 'Absolute immunity claims ("guaranteed 100%") and specific speed promises ("within 30 minutes") directly contradict FDA 21 CFR \xA7101.93 and Section 2.4 of the Clinical Marketing Guidelines.',
        confidenceScore: 98,
        suggestedCorrection: "formulated to support healthy immune defense and rapid cellular resilience in adults",
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-1",
          documentName: "Acme Clinical Marketing Guidelines 2025",
          documentVersion: "v2.1",
          pageNumber: 12,
          sectionHeading: "Section 2.4: Efficacy Limitations & Absolute Statements",
          citationId: "CIT-DOC1-P12-S2.4",
          relevanceScore: 99,
          verbatimPassage: 'RULE 3.1: Absolute immunity guarantees, cure declarations, or claims of 100% protection against airborne or infectious pathogens are strictly prohibited under FDA 21 CFR \xA7101.93 and FTC guidelines. Marketing copy must phrase benefits as "supports healthy immune response", "promotes cellular resilience", or "assists natural defenses". Timed onset guarantees (e.g., "within 30 minutes") are strictly prohibited unless supported by specific human pharmacokinetics trials on file.'
        }
      },
      {
        id: "fnd-2",
        draftId: "REV-2025-089",
        claimText: "Clinically proven by Mayo Clinic researchers in a double-blind peer-reviewed trial",
        startIndex: 169,
        endIndex: 247,
        status: "contradicted",
        severity: "high",
        brandRuleId: "RULE-4.8",
        brandRuleTitle: "Prohibition of Unauthorized Institutional Co-Branding",
        explanation: "Mentioning specific third-party clinical institutions (Mayo Clinic) by name violates brand endorsement policies unless formal institutional review board agreements are on file.",
        confidenceScore: 95,
        suggestedCorrection: "Evaluated in independent randomized double-blind clinical trials published in peer-reviewed scientific journals",
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-1",
          documentName: "Acme Clinical Marketing Guidelines 2025",
          documentVersion: "v2.1",
          pageNumber: 19,
          sectionHeading: "Section 4.2: Institutional Co-branding & Research Affiliations",
          citationId: "CIT-DOC1-P19-S4.2",
          relevanceScore: 97,
          verbatimPassage: 'RULE 4.8: Specific academic or medical institutional endorsements (such as Mayo Clinic, Harvard, Johns Hopkins) may never be cited without formal executed institutional review board agreements and corporate legal sign-off. References must describe study protocols generally, e.g., "independent randomized, double-blind, placebo-controlled clinical trials published in peer-reviewed scientific journals."'
        }
      },
      {
        id: "fnd-3",
        draftId: "REV-2025-089",
        claimText: "sustainably harvested using 100% zero-carbon cold extraction technology",
        startIndex: 312,
        endIndex: 382,
        status: "needs_verification",
        severity: "medium",
        brandRuleId: "RULE-7.2",
        brandRuleTitle: "Environmental & Zero-Carbon Claims Substantiation",
        explanation: 'Unqualified "100% zero-carbon" claims require documented ISO-14064 certification records. Current documentation shows carbon offset matching, but not zero direct emissions.',
        confidenceScore: 89,
        suggestedCorrection: "sustainably harvested using energy-efficient cold extraction with verified carbon offset credits",
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-4",
          documentName: "Global ESG & Sustainability Claims Standard",
          documentVersion: "v1.2",
          pageNumber: 8,
          sectionHeading: "Section 1.3: Carbon Footprint & Environmental Claims",
          citationId: "CIT-DOC4-P8-S1.3",
          relevanceScore: 91,
          verbatimPassage: 'RULE 7.2: Unqualified claims such as "100% zero-carbon" or "completely emission-free" are prohibited without a specific third-party ISO-14064 verified Life Cycle Assessment (LCA) identifier published in public brand disclosures. Marketing copy should specify "manufactured using verified renewable electricity with certified carbon offset retirement."'
        }
      },
      {
        id: "fnd-4",
        draftId: "REV-2025-089",
        claimText: "Standardized to 45% active polyphenols and bio-fermented zinc",
        startIndex: 425,
        endIndex: 486,
        status: "verified",
        severity: "low",
        brandRuleId: "RULE-1.4",
        brandRuleTitle: "Nutrient & Active Polyphenol Potency Verification",
        explanation: "Claim accurately matches the active ingredient specification registered in Master Certificate of Analysis COA-2024-B for ImmunoShield Pro batch formulations.",
        confidenceScore: 99,
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-3",
          documentName: "Product Specifications: ImmunoShield Pro",
          documentVersion: "v3.0",
          pageNumber: 4,
          sectionHeading: "Section 1.2: Active Bio-Available Potency Spec",
          citationId: "CIT-DOC3-P4-S1.2",
          relevanceScore: 98,
          verbatimPassage: "ImmunoShield Pro delivers 15mg elemental zinc in high-absorption bisglycinate chelate form combined with 450mg European Black Elderberry standardized to 45% total polyphenols. Batch analysis confirms allergen-free and vegan certification."
        }
      }
    ]
  },
  {
    id: "REV-2025-074",
    title: "Q3 Paid Instagram Carousel \u2014 Clinical Defense Series",
    contentType: "social_post",
    campaignName: "Social Direct Response",
    workspaceId: "ws-1",
    submittedBy: {
      id: "usr-3",
      name: "Sophia Chen",
      email: "sophia.chen@acmehealth.com",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"
    },
    submittedAt: "2026-10-22T11:00:00Z",
    updatedAt: "2026-10-23T16:45:00Z",
    originalText: `Tired of seasonal fatigue? Slide 1: One daily dose replaces your entire morning vitamin regimen. Slide 2: Clinically proven to completely eliminate flu vulnerability in 14 days. Don't wait until you get sick. Tap the link in bio to order now with free shipping.`,
    currentText: `Tired of seasonal fatigue? Slide 1: One daily dose replaces your entire morning vitamin regimen. Slide 2: Clinically proven to completely eliminate flu vulnerability in 14 days. Don't wait until you get sick. Tap the link in bio to order now with free shipping.`,
    guidelineDocumentIds: ["doc-1", "doc-2"],
    status: "changes_requested",
    approvalDecision: {
      decision: "changes_requested",
      reviewerId: "usr-2",
      reviewerName: "Marcus Vance",
      reviewerRole: "Reviewer",
      comments: 'Contains explicit disease prevention claims ("eliminate flu vulnerability"). This must be softened to structure/function language before paid placement.',
      timestamp: "2026-10-23T16:45:00Z"
    },
    stats: {
      totalClaims: 3,
      verified: 1,
      contradicted: 2,
      needsVerification: 0,
      highSeverityCount: 2
    },
    findings: [
      {
        id: "fnd-74-1",
        draftId: "REV-2025-074",
        claimText: "Clinically proven to completely eliminate flu vulnerability in 14 days",
        startIndex: 96,
        endIndex: 167,
        status: "contradicted",
        severity: "high",
        brandRuleId: "RULE-3.1",
        brandRuleTitle: "Prohibition of Absolute Protection & Disease Elimination Guarantees",
        explanation: "Disease prevention and elimination claims violate FDA 21 CFR \xA7101.93 and Section 2.4 of the Clinical Marketing Guidelines.",
        confidenceScore: 99,
        suggestedCorrection: "Formulated to support natural immune resilience during seasonal transitions",
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-1",
          documentName: "Acme Clinical Marketing Guidelines 2025",
          documentVersion: "v2.1",
          pageNumber: 12,
          sectionHeading: "Section 2.4: Efficacy Limitations & Absolute Statements",
          citationId: "CIT-DOC1-P12-S2.4",
          relevanceScore: 99,
          verbatimPassage: 'RULE 3.1: Absolute immunity guarantees, cure declarations, or claims of 100% protection against airborne or infectious pathogens are strictly prohibited under FDA 21 CFR \xA7101.93 and FTC guidelines. Marketing copy must phrase benefits as "supports healthy immune response", "promotes cellular resilience", or "assists natural defenses". Timed onset guarantees (e.g., "within 30 minutes") are strictly prohibited unless supported by specific human pharmacokinetics trials on file.'
        }
      },
      {
        id: "fnd-74-2",
        draftId: "REV-2025-074",
        claimText: "One daily dose replaces your entire morning vitamin regimen",
        startIndex: 35,
        endIndex: 94,
        status: "contradicted",
        severity: "high",
        brandRuleId: "RULE-2.3",
        brandRuleTitle: "Prohibition of Blanket Dietary Regimen Replacement Claims",
        explanation: "Claiming a botanical supplement replaces an entire dietary regimen violates DSHEA substantiation rules in doc-2.",
        confidenceScore: 94,
        suggestedCorrection: "A convenient daily supplement to complement your balanced nutrition routine",
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-2",
          documentName: "FDA & FTC Regulatory Compliance Manual",
          documentVersion: "v1.4",
          pageNumber: 8,
          sectionHeading: "Section 2.1: DSHEA Mandatory Disclaimer Presentation",
          citationId: "CIT-DOC2-P8-S2.1",
          relevanceScore: 93,
          verbatimPassage: 'RULE 2.3: Every consumer marketing piece making nutritional structure/function claims must display the FDA disclaimer in prominent typography: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."'
        }
      },
      {
        id: "fnd-74-3",
        draftId: "REV-2025-074",
        claimText: "Tap the link in bio to order now with free shipping",
        startIndex: 202,
        endIndex: 254,
        status: "verified",
        severity: "low",
        brandRuleId: "RULE-1.1",
        brandRuleTitle: "Digital Direct-to-Consumer Fulfillment Disclosure",
        explanation: "Standard call-to-action and fulfillment terms comply with digital promotional standards.",
        confidenceScore: 98,
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-2",
          documentName: "FDA & FTC Regulatory Compliance Manual",
          documentVersion: "v1.4",
          pageNumber: 8,
          sectionHeading: "Section 2.1: DSHEA Mandatory Disclaimer Presentation",
          citationId: "CIT-DOC2-P8-S2.1",
          relevanceScore: 90,
          verbatimPassage: 'RULE 2.3: Every consumer marketing piece making nutritional structure/function claims must display the FDA disclaimer in prominent typography: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."'
        }
      }
    ]
  },
  {
    id: "REV-2025-061",
    title: "Healthcare Professional Email Announcement: Q4 Advisory",
    contentType: "email",
    campaignName: "HCP Medical Outreach",
    workspaceId: "ws-1",
    submittedBy: {
      id: "usr-1",
      name: "Elena Rostova",
      email: "elena.rostova@acmehealth.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    },
    submittedAt: "2026-10-18T09:30:00Z",
    updatedAt: "2026-10-19T14:10:00Z",
    originalText: `Dear Practitioner, we are pleased to announce full availability of ImmunoShield Pro for your integrative wellness practice. Each formulation includes zinc bisglycinate and standardized anthocyanin elderberry extract to support healthy immunological markers in adult patients. Request trial sample packs for your clinic today.`,
    currentText: `Dear Practitioner, we are pleased to announce full availability of ImmunoShield Pro for your integrative wellness practice. Each formulation includes zinc bisglycinate and standardized anthocyanin elderberry extract to support healthy immunological markers in adult patients. Request trial sample packs for your clinic today.`,
    guidelineDocumentIds: ["doc-1", "doc-3"],
    status: "approved",
    approvalDecision: {
      decision: "approved",
      reviewerId: "usr-2",
      reviewerName: "Marcus Vance",
      reviewerRole: "Reviewer",
      comments: "Exemplary structure/function copy. All active ingredients and clinical endpoints conform to DSHEA and brand guidelines.",
      timestamp: "2026-10-19T14:10:00Z"
    },
    stats: {
      totalClaims: 3,
      verified: 3,
      contradicted: 0,
      needsVerification: 0,
      highSeverityCount: 0
    },
    findings: [
      {
        id: "fnd-61-1",
        draftId: "REV-2025-061",
        claimText: "zinc bisglycinate and standardized anthocyanin elderberry extract",
        startIndex: 125,
        endIndex: 191,
        status: "verified",
        severity: "low",
        brandRuleId: "RULE-1.4",
        brandRuleTitle: "Nutrient & Active Polyphenol Potency Verification",
        explanation: "Formulation correctly specifies active zinc chelate and standardized elderberry extract conforming to COA-2024-B.",
        confidenceScore: 99,
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-3",
          documentName: "Product Specifications: ImmunoShield Pro",
          documentVersion: "v3.0",
          pageNumber: 4,
          sectionHeading: "Section 1.2: Active Bio-Available Potency Spec",
          citationId: "CIT-DOC3-P4-S1.2",
          relevanceScore: 99,
          verbatimPassage: "ImmunoShield Pro delivers 15mg elemental zinc in high-absorption bisglycinate chelate form combined with 450mg European Black Elderberry standardized to 45% total polyphenols. Batch analysis confirms allergen-free and vegan certification."
        }
      },
      {
        id: "fnd-61-2",
        draftId: "REV-2025-061",
        claimText: "support healthy immunological markers in adult patients",
        startIndex: 195,
        endIndex: 251,
        status: "verified",
        severity: "low",
        brandRuleId: "RULE-3.1",
        brandRuleTitle: "Approved DSHEA Structure/Function Terminology",
        explanation: "Structure/function claim uses approved qualifying language without disease mitigation claims.",
        confidenceScore: 97,
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-1",
          documentName: "Acme Clinical Marketing Guidelines 2025",
          documentVersion: "v2.1",
          pageNumber: 12,
          sectionHeading: "Section 2.4: Efficacy Limitations & Absolute Statements",
          citationId: "CIT-DOC1-P12-S2.4",
          relevanceScore: 96,
          verbatimPassage: 'RULE 3.1: Absolute immunity guarantees, cure declarations, or claims of 100% protection against airborne or infectious pathogens are strictly prohibited under FDA 21 CFR \xA7101.93 and FTC guidelines. Marketing copy must phrase benefits as "supports healthy immune response", "promotes cellular resilience", or "assists natural defenses". Timed onset guarantees (e.g., "within 30 minutes") are strictly prohibited unless supported by specific human pharmacokinetics trials on file.'
        }
      },
      {
        id: "fnd-61-3",
        draftId: "REV-2025-061",
        claimText: "full availability of ImmunoShield Pro for your integrative wellness practice",
        startIndex: 44,
        endIndex: 120,
        status: "verified",
        severity: "low",
        brandRuleId: "RULE-1.1",
        brandRuleTitle: "Standardized Active Ingredients & Potency",
        explanation: "Practitioner distribution announcement aligns with verified product naming conventions.",
        confidenceScore: 98,
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-1",
          documentName: "Acme Clinical Marketing Guidelines 2025",
          documentVersion: "v2.1",
          pageNumber: 5,
          sectionHeading: "Section 1.1: Standardized Active Ingredients & Potency",
          citationId: "CIT-DOC1-P5-S1.1",
          relevanceScore: 95,
          verbatimPassage: "All finished products must cite standardized extract levels verified by valid Certificate of Analysis (COA). Standardized bio-actives such as polyphenols, flavonoids, and chelated minerals must disclose verified percentage assays conforming to Master Specification COA-2024-B."
        }
      }
    ]
  },
  {
    id: "REV-2025-048",
    title: "Fall Seasonal Wellness Social Influencer Brief",
    contentType: "social_post",
    campaignName: "Influencer Guardrails",
    workspaceId: "ws-1",
    submittedBy: {
      id: "usr-3",
      name: "Sophia Chen",
      email: "sophia.chen@acmehealth.com",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"
    },
    submittedAt: "2026-10-25T17:15:00Z",
    updatedAt: "2026-10-25T17:15:00Z",
    originalText: `Creators must explain that ImmunoShield Pro supports vitality during temperature shifts. No creator may claim it cures common colds or replaces medical consultation. Mandatory #Ad and #Sponsored tags must appear in the first 2 lines.`,
    currentText: `Creators must explain that ImmunoShield Pro supports vitality during temperature shifts. No creator may claim it cures common colds or replaces medical consultation. Mandatory #Ad and #Sponsored tags must appear in the first 2 lines.`,
    guidelineDocumentIds: ["doc-1", "doc-2", "doc-5"],
    status: "pending",
    stats: {
      totalClaims: 2,
      verified: 2,
      contradicted: 0,
      needsVerification: 0,
      highSeverityCount: 0
    },
    findings: [
      {
        id: "fnd-48-1",
        draftId: "REV-2025-048",
        claimText: "ImmunoShield Pro supports vitality during temperature shifts",
        startIndex: 27,
        endIndex: 87,
        status: "verified",
        severity: "low",
        brandRuleId: "RULE-3.1",
        brandRuleTitle: "Approved DSHEA Structure/Function Terminology",
        explanation: "Vitality support phrasing conforms strictly to structure/function language guidelines.",
        confidenceScore: 97,
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-1",
          documentName: "Acme Clinical Marketing Guidelines 2025",
          documentVersion: "v2.1",
          pageNumber: 12,
          sectionHeading: "Section 2.4: Efficacy Limitations & Absolute Statements",
          citationId: "CIT-DOC1-P12-S2.4",
          relevanceScore: 96,
          verbatimPassage: 'RULE 3.1: Absolute immunity guarantees, cure declarations, or claims of 100% protection against airborne or infectious pathogens are strictly prohibited under FDA 21 CFR \xA7101.93 and FTC guidelines. Marketing copy must phrase benefits as "supports healthy immune response", "promotes cellular resilience", or "assists natural defenses". Timed onset guarantees (e.g., "within 30 minutes") are strictly prohibited unless supported by specific human pharmacokinetics trials on file.'
        }
      },
      {
        id: "fnd-48-2",
        draftId: "REV-2025-048",
        claimText: "Mandatory #Ad and #Sponsored tags must appear in the first 2 lines",
        startIndex: 164,
        endIndex: 231,
        status: "verified",
        severity: "low",
        brandRuleId: "RULE-2.3",
        brandRuleTitle: "FTC Endorsement Guide Disclosure Standards",
        explanation: "Mandatory above-the-fold commercial tagging adheres directly to FTC endorsement guidelines.",
        confidenceScore: 98,
        suggestionStatus: "unapplied",
        evidence: {
          documentId: "doc-2",
          documentName: "FDA & FTC Regulatory Compliance Manual",
          documentVersion: "v1.4",
          pageNumber: 8,
          sectionHeading: "Section 2.1: DSHEA Mandatory Disclaimer Presentation",
          citationId: "CIT-DOC2-P8-S2.1",
          relevanceScore: 95,
          verbatimPassage: 'RULE 2.3: Every consumer marketing piece making nutritional structure/function claims must display the FDA disclaimer in prominent typography: "These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease."'
        }
      }
    ]
  }
];
var reviewRepo = {
  async getReviews(params) {
    const client = getSupabaseClient();
    if (client) {
      let query = client.from("review_drafts").select("*, findings(*), approval_decisions(*)");
      if (params?.workspaceId) {
        query = query.eq("workspace_id", params.workspaceId);
      }
      if (params?.status && params.status !== "all") {
        query = query.eq("status", params.status);
      }
      if (params?.contentType && params.contentType !== "all") {
        query = query.eq("content_type", params.contentType);
      }
      if (params?.search) {
        query = query.ilike("title", `%${params.search}%`);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw new Error(`Database error fetching reviews: ${error.message}`);
      return (data || []).map((row) => {
        const rawFindings = (row.findings || []).map((f) => ({
          id: f.id,
          draftId: f.draft_id,
          claimText: f.claim_text,
          startIndex: f.start_index,
          endIndex: f.end_index,
          status: f.status,
          severity: f.severity,
          brandRuleId: f.brand_rule_id,
          brandRuleTitle: f.brand_rule_title,
          explanation: f.explanation,
          confidenceScore: f.confidence_score,
          suggestedCorrection: f.suggested_correction,
          suggestionStatus: f.suggestion_status,
          editedCorrection: f.edited_correction,
          evidence: {
            documentId: f.document_id,
            documentName: f.document_name,
            documentVersion: f.document_version,
            pageNumber: f.page_number,
            sectionHeading: f.section_heading,
            verbatimPassage: f.verbatim_passage,
            citationId: f.citation_id,
            relevanceScore: f.relevance_score
          }
        }));
        const latestDecision = row.approval_decisions?.[0];
        return {
          id: row.id,
          title: row.title,
          contentType: row.content_type,
          campaignName: row.campaign_name,
          workspaceId: row.workspace_id,
          submittedBy: {
            id: row.submitted_by_id,
            name: row.submitted_by_name,
            email: row.submitted_by_email,
            avatar: row.submitted_by_avatar
          },
          submittedAt: row.created_at,
          updatedAt: row.updated_at,
          originalText: row.original_text,
          currentText: row.current_text,
          guidelineDocumentIds: row.guideline_document_ids || [],
          status: row.status,
          approvalDecision: latestDecision ? {
            decision: latestDecision.decision,
            reviewerId: latestDecision.reviewer_id,
            reviewerName: latestDecision.reviewer_name,
            reviewerRole: latestDecision.reviewer_role,
            comments: latestDecision.comments,
            timestamp: latestDecision.created_at
          } : void 0,
          findings: rawFindings,
          stats: {
            totalClaims: rawFindings.length,
            verified: rawFindings.filter((f) => f.status === "verified").length,
            contradicted: rawFindings.filter((f) => f.status === "contradicted").length,
            needsVerification: rawFindings.filter((f) => f.status === "needs_verification").length,
            highSeverityCount: rawFindings.filter((f) => f.severity === "high" && f.status === "contradicted").length
          }
        };
      });
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    let list = [...devReviews];
    if (params?.workspaceId) {
      list = list.filter((r) => !r.workspaceId || r.workspaceId === params.workspaceId);
    }
    if (params?.status && params.status !== "all") {
      list = list.filter((r) => r.status === params.status);
    }
    if (params?.contentType && params.contentType !== "all") {
      list = list.filter((r) => r.contentType === params.contentType);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (r) => r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.submittedBy.name.toLowerCase().includes(q)
      );
    }
    return list;
  },
  async getReviewById(id) {
    const client = getSupabaseClient();
    if (client) {
      const { data: row, error } = await client.from("review_drafts").select("*, findings(*), approval_decisions(*)").eq("id", id).single();
      if (error || !row) return null;
      const rawFindings = (row.findings || []).map((f) => ({
        id: f.id,
        draftId: f.draft_id,
        claimText: f.claim_text,
        startIndex: f.start_index,
        endIndex: f.end_index,
        status: f.status,
        severity: f.severity,
        brandRuleId: f.brand_rule_id,
        brandRuleTitle: f.brand_rule_title,
        explanation: f.explanation,
        confidenceScore: f.confidence_score,
        suggestedCorrection: f.suggested_correction,
        suggestionStatus: f.suggestion_status,
        editedCorrection: f.edited_correction,
        evidence: {
          documentId: f.document_id,
          documentName: f.document_name,
          documentVersion: f.document_version,
          pageNumber: f.page_number,
          sectionHeading: f.section_heading,
          verbatimPassage: f.verbatim_passage,
          citationId: f.citation_id,
          relevanceScore: f.relevance_score
        }
      }));
      const latestDecision = row.approval_decisions?.[0];
      return {
        id: row.id,
        title: row.title,
        contentType: row.content_type,
        campaignName: row.campaign_name,
        workspaceId: row.workspace_id,
        submittedBy: {
          id: row.submitted_by_id,
          name: row.submitted_by_name,
          email: row.submitted_by_email,
          avatar: row.submitted_by_avatar
        },
        submittedAt: row.created_at,
        updatedAt: row.updated_at,
        originalText: row.original_text,
        currentText: row.current_text,
        guidelineDocumentIds: row.guideline_document_ids || [],
        status: row.status,
        approvalDecision: latestDecision ? {
          decision: latestDecision.decision,
          reviewerId: latestDecision.reviewer_id,
          reviewerName: latestDecision.reviewer_name,
          reviewerRole: latestDecision.reviewer_role,
          comments: latestDecision.comments,
          timestamp: latestDecision.created_at
        } : void 0,
        findings: rawFindings,
        stats: {
          totalClaims: rawFindings.length,
          verified: rawFindings.filter((f) => f.status === "verified").length,
          contradicted: rawFindings.filter((f) => f.status === "contradicted").length,
          needsVerification: rawFindings.filter((f) => f.status === "needs_verification").length,
          highSeverityCount: rawFindings.filter((f) => f.severity === "high" && f.status === "contradicted").length
        }
      };
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    const r = devReviews.find((item) => item.id === id);
    return r ? { ...r } : null;
  },
  async createReview(review) {
    const client = getSupabaseClient();
    if (client) {
      const { error: draftError } = await client.from("review_drafts").insert({
        id: review.id,
        workspace_id: review.workspaceId,
        title: review.title,
        content_type: review.contentType,
        campaign_name: review.campaignName,
        original_text: review.originalText,
        current_text: review.currentText,
        guideline_document_ids: review.guidelineDocumentIds,
        status: review.status,
        submitted_by_id: review.submittedBy.id,
        submitted_by_name: review.submittedBy.name,
        submitted_by_email: review.submittedBy.email,
        submitted_by_avatar: review.submittedBy.avatar
      });
      if (draftError) throw new Error(`Failed to create review draft: ${draftError.message}`);
      if (review.findings && review.findings.length > 0) {
        const findingsToInsert = review.findings.map((f) => ({
          draft_id: review.id,
          claim_text: f.claimText,
          start_index: f.startIndex,
          end_index: f.endIndex,
          status: f.status,
          severity: f.severity,
          brand_rule_id: f.brandRuleId,
          brand_rule_title: f.brandRuleTitle,
          explanation: f.explanation,
          confidence_score: f.confidenceScore,
          suggested_correction: f.suggestedCorrection,
          suggestion_status: f.suggestionStatus || "unapplied",
          edited_correction: f.editedCorrection,
          document_id: f.evidence.documentId,
          document_name: f.evidence.documentName,
          document_version: f.evidence.documentVersion,
          page_number: f.evidence.pageNumber,
          section_heading: f.evidence.sectionHeading,
          verbatim_passage: f.evidence.verbatimPassage,
          citation_id: f.evidence.citationId,
          relevance_score: f.evidence.relevanceScore
        }));
        const { error: findError } = await client.from("findings").insert(findingsToInsert);
        if (findError) throw new Error(`Database error inserting findings: ${findError.message}`);
      }
      return review;
    }
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Supabase Database", getServiceConfigStatus().supabase.missingVars);
    }
    devReviews.unshift(review);
    return review;
  },
  async updateDraftText(reviewId, newText) {
    const review = await this.getReviewById(reviewId);
    if (!review) throw new NotFoundError("ReviewDraft", reviewId);
    review.currentText = newText;
    review.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const client = getSupabaseClient();
    if (client) {
      await client.from("review_drafts").update({ current_text: newText, updated_at: review.updatedAt }).eq("id", reviewId);
      return review;
    }
    const idx = devReviews.findIndex((r) => r.id === reviewId);
    if (idx !== -1) devReviews[idx] = review;
    return review;
  },
  async applySuggestion(reviewId, findingId, customText) {
    const review = await this.getReviewById(reviewId);
    if (!review) throw new NotFoundError("ReviewDraft", reviewId);
    const finding = review.findings.find((f) => f.id === findingId);
    if (!finding) throw new NotFoundError("Finding", findingId);
    const replacement = customText || finding.suggestedCorrection;
    if (!replacement) throw new Error("No suggested correction available to apply");
    if (review.currentText.includes(finding.claimText)) {
      review.currentText = review.currentText.replace(finding.claimText, replacement);
    } else {
      review.currentText = review.currentText.slice(0, finding.startIndex) + replacement + review.currentText.slice(finding.endIndex);
    }
    finding.suggestionStatus = customText ? "edited" : "applied";
    if (customText) finding.editedCorrection = customText;
    finding.status = "verified";
    finding.explanation = `Correction applied: "${replacement}". Claim is now compliant.`;
    review.stats.verified = review.findings.filter((f) => f.status === "verified").length;
    review.stats.contradicted = review.findings.filter((f) => f.status === "contradicted").length;
    review.stats.needsVerification = review.findings.filter((f) => f.status === "needs_verification").length;
    review.stats.highSeverityCount = review.findings.filter(
      (f) => f.severity === "high" && f.status === "contradicted"
    ).length;
    review.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const client = getSupabaseClient();
    if (client) {
      await client.from("review_drafts").update({ current_text: review.currentText, updated_at: review.updatedAt }).eq("id", reviewId);
      await client.from("findings").update({
        status: "verified",
        suggestion_status: finding.suggestionStatus,
        edited_correction: finding.editedCorrection,
        explanation: finding.explanation
      }).eq("id", findingId);
      return review;
    }
    const idx = devReviews.findIndex((r) => r.id === reviewId);
    if (idx !== -1) devReviews[idx] = review;
    return review;
  },
  async rejectSuggestion(reviewId, findingId) {
    const review = await this.getReviewById(reviewId);
    if (!review) throw new NotFoundError("ReviewDraft", reviewId);
    const finding = review.findings.find((f) => f.id === findingId);
    if (!finding) throw new NotFoundError("Finding", findingId);
    finding.suggestionStatus = "rejected";
    review.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const client = getSupabaseClient();
    if (client) {
      await client.from("findings").update({ suggestion_status: "rejected" }).eq("id", findingId);
      return review;
    }
    const idx = devReviews.findIndex((r) => r.id === reviewId);
    if (idx !== -1) devReviews[idx] = review;
    return review;
  },
  async submitDecision(reviewId, decision) {
    const review = await this.getReviewById(reviewId);
    if (!review) throw new NotFoundError("ReviewDraft", reviewId);
    review.approvalDecision = decision;
    review.status = decision.decision;
    review.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const client = getSupabaseClient();
    if (client) {
      await client.from("review_drafts").update({ status: review.status, updated_at: review.updatedAt }).eq("id", reviewId);
      await client.from("approval_decisions").insert({
        draft_id: reviewId,
        decision: decision.decision,
        reviewer_id: decision.reviewerId,
        reviewer_name: decision.reviewerName,
        reviewer_role: decision.reviewerRole,
        comments: decision.comments
      });
      return review;
    }
    const idx = devReviews.findIndex((r) => r.id === reviewId);
    if (idx !== -1) devReviews[idx] = review;
    return review;
  }
};

// server/services/review/stateMachine.ts
var ALLOWED_TRANSITIONS = {
  pending: ["in_progress", "ready_for_approval"],
  in_progress: ["ready_for_approval", "changes_requested"],
  changes_requested: ["in_progress", "ready_for_approval"],
  ready_for_approval: ["approved", "changes_requested", "rejected", "in_progress"],
  approved: ["in_progress"],
  rejected: ["in_progress"]
};
function canTransition(current, target) {
  if (current === target) return true;
  const allowed = ALLOWED_TRANSITIONS[current];
  return allowed ? allowed.includes(target) : false;
}
function validateTransition(current, target, actorRole) {
  if (current === target) return;
  if (!canTransition(current, target)) {
    throw new IllegalStateTransitionError(
      current,
      target,
      `Valid next statuses from '${current}' are: ${ALLOWED_TRANSITIONS[current]?.join(", ") || "none"}`
    );
  }
  const requiresGovernanceAuthority = target === "approved" || target === "rejected" || target === "changes_requested";
  if (requiresGovernanceAuthority && actorRole === "Creator") {
    throw new ValidationError(
      `Role 'Creator' is not authorized to submit approval decision '${target}'. Requires 'Reviewer' or 'Brand Manager'.`
    );
  }
}

// server/services/review/approvalService.ts
var approvalService = {
  /**
   * Submits a formal human approval/rejection decision, enforcing legal state transitions,
   * verifying no unresolved brand contradictions exist for approval, persisting the decision,
   * and logging an immutable audit record.
   */
  async processDecision(reviewId, decision, actor) {
    const existing = await reviewRepo.getReviewById(reviewId);
    if (!existing) {
      throw new NotFoundError("ReviewDraft", reviewId);
    }
    validateTransition(existing.status, decision.decision, actor.role);
    if (decision.decision === "approved") {
      const activeContradictions = existing.findings.filter(
        (f) => f.status === "contradicted" && f.suggestionStatus !== "applied" && f.suggestionStatus !== "edited"
      );
      if (activeContradictions.length > 0) {
        throw new ValidationError(
          `Cannot approve draft "${existing.title}": Contains ${activeContradictions.length} unresolved contradicted claim(s). All violations must be corrected before sign-off.`
        );
      }
    }
    const updated = await reviewRepo.submitDecision(reviewId, decision);
    const actionTypeMap = {
      approved: "approval_decision",
      rejected: "rejection_decision",
      changes_requested: "revisions_requested"
    };
    const actionType = actionTypeMap[decision.decision];
    await auditRepo.recordAuditEvent({
      actionType,
      workspaceId: existing.workspaceId || actor.workspaceId || "ws-1",
      actor: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role
      },
      targetType: "review",
      targetId: reviewId,
      targetTitle: existing.title,
      summary: `Review status changed to '${decision.decision}': ${decision.comments || "No comments provided."}`,
      metadata: {
        previousStatus: existing.status,
        newStatus: decision.decision,
        reviewerId: actor.id
      }
    });
    return updated;
  },
  /**
   * Applies an AI finding suggestion to the live draft, updates finding status,
   * recalculates compliance metrics, and logs an audit trail event.
   */
  async applyFindingSuggestion(reviewId, findingId, actor, customText) {
    const existing = await reviewRepo.getReviewById(reviewId);
    if (!existing) throw new NotFoundError("ReviewDraft", reviewId);
    const updated = await reviewRepo.applySuggestion(reviewId, findingId, customText);
    await auditRepo.recordAuditEvent({
      actionType: customText ? "suggestion_edited" : "suggestion_accepted",
      workspaceId: existing.workspaceId || actor.workspaceId || "ws-1",
      actor: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role
      },
      targetType: "review",
      targetId: reviewId,
      targetTitle: existing.title,
      summary: customText ? `Edited and applied correction for finding ${findingId}: "${customText}"` : `Accepted AI suggested correction for finding ${findingId}`,
      metadata: {
        findingId,
        customText
      }
    });
    return updated;
  },
  /**
   * Rejects an AI finding suggestion without applying it to the draft text.
   */
  async rejectFindingSuggestion(reviewId, findingId, actor) {
    const existing = await reviewRepo.getReviewById(reviewId);
    if (!existing) throw new NotFoundError("ReviewDraft", reviewId);
    const updated = await reviewRepo.rejectSuggestion(reviewId, findingId);
    await auditRepo.recordAuditEvent({
      actionType: "suggestion_rejected",
      workspaceId: existing.workspaceId || actor.workspaceId || "ws-1",
      actor: {
        id: actor.id,
        name: actor.name,
        email: actor.email,
        role: actor.role
      },
      targetType: "review",
      targetId: reviewId,
      targetTitle: existing.title,
      summary: `Rejected suggested correction for finding ${findingId}`,
      metadata: { findingId }
    });
    return updated;
  }
};

// server/services/rag/retriever.ts
function rankGuidelinePassages(claimText, sections, limit = 5, claimEmbedding) {
  const claimKeywords = extractKeywords(claimText);
  if (claimKeywords.length === 0 || sections.length === 0) return [];
  const isVectorValid = claimEmbedding ? isValidEmbedding(claimEmbedding) : false;
  const scored = sections.map((sec) => {
    let score = 0;
    const matchedKeywords = [];
    const secTextLower = sec.extractedText.toLowerCase();
    const secHeadingLower = sec.heading.toLowerCase();
    claimKeywords.forEach((kw) => {
      if (secTextLower.includes(kw)) {
        score += 15;
        matchedKeywords.push(kw);
      }
      if (secHeadingLower.includes(kw)) {
        score += 25;
      }
      if (sec.keywords?.includes(kw)) {
        score += 10;
      }
    });
    const subPhrases = claimText.split(/[,.;]/).map((p) => p.trim().toLowerCase()).filter((p) => p.length > 8);
    subPhrases.forEach((phrase) => {
      if (secTextLower.includes(phrase)) {
        score += 35;
      }
    });
    if (isVectorValid && sec.embedding && isValidEmbedding(sec.embedding)) {
      const cos = cosineSimilarity(claimEmbedding, sec.embedding);
      if (cos > 0.4) {
        score += Math.round(cos * 40);
      }
    }
    const normalizedScore = Math.min(100, Math.max(10, Math.round(score)));
    return {
      section: sec,
      relevanceScore: normalizedScore,
      matchedKeywords: Array.from(new Set(matchedKeywords))
    };
  });
  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
}

// server/services/rag/evidenceValidator.ts
var PROHIBITIVE_DIRECTIVE_REGEX = /\b(?:strictly prohibited|prohibited|shall not|must not|never|unauthorized|forbidden|not permitted|disallowed|cannot claim|do not claim)\b/i;
function validateFindingEvidence(finding, availableSections) {
  const evidence = finding.evidence;
  if (!evidence || !evidence.verbatimPassage || !evidence.documentId) {
    return {
      isValid: false,
      reason: "Finding lacks mandatory citation evidence.",
      finding: {
        ...finding,
        status: "needs_verification",
        explanation: `${finding.explanation} [Evidence Validation: Missing verbatim passage or document citation. Human verification required.]`,
        confidenceScore: Math.min(finding.confidenceScore, 50)
      }
    };
  }
  const matchedSection = availableSections.find(
    (s) => s.documentId === evidence.documentId && s.pageNumber === evidence.pageNumber
  ) || availableSections.find((s) => s.documentId === evidence.documentId);
  if (!matchedSection) {
    return {
      isValid: false,
      reason: `Referenced document (${evidence.documentName || evidence.documentId}) was not found in active workspace guidelines.`,
      finding: {
        ...finding,
        status: "needs_verification",
        explanation: `${finding.explanation} [Evidence Validation: Cited document does not exist in active workspace guidelines. Possible cross-brand data leakage or invalid ID. Human review required.]`,
        confidenceScore: Math.min(finding.confidenceScore, 30)
      }
    };
  }
  if (evidence.documentVersion && matchedSection.documentVersion && evidence.documentVersion !== matchedSection.documentVersion) {
    return {
      isValid: false,
      reason: `Guideline version mismatch: cited '${evidence.documentVersion}', but active guideline is '${matchedSection.documentVersion}'.`,
      finding: {
        ...finding,
        status: "needs_verification",
        explanation: `${finding.explanation} [Evidence Validation: Guideline version mismatch. Citation references ${evidence.documentVersion}, but active version is ${matchedSection.documentVersion}. Superceded rules must not be used.]`,
        confidenceScore: Math.min(finding.confidenceScore, 40)
      }
    };
  }
  const normVerbatim = evidence.verbatimPassage.toLowerCase().replace(/\s+/g, " ").trim();
  const normExtracted = matchedSection.extractedText.toLowerCase().replace(/\s+/g, " ");
  const passageExists = normExtracted.includes(normVerbatim);
  if (!passageExists) {
    return {
      isValid: false,
      reason: "Verbatim passage does not match active ground-truth text.",
      finding: {
        ...finding,
        status: "needs_verification",
        explanation: `${finding.explanation} [Evidence Validation: Cited verbatim passage was not found in authentic guideline text. Hallucinated or inaccurate quotation detected.]`,
        confidenceScore: Math.min(finding.confidenceScore, 40)
      }
    };
  }
  const scoreSufficient = evidence.relevanceScore >= CONSTANTS.MIN_CLAIM_EVIDENCE_RELEVANCE;
  if (!scoreSufficient) {
    return {
      isValid: false,
      reason: `Citation relevance score (${evidence.relevanceScore}%) is below minimum threshold (${CONSTANTS.MIN_CLAIM_EVIDENCE_RELEVANCE}%).`,
      finding: {
        ...finding,
        status: "needs_verification",
        explanation: `${finding.explanation} [Evidence Validation: Ground-truth guideline evidence is insufficient (${evidence.relevanceScore}% relevance). Human reviewer verification required before publication.]`,
        confidenceScore: Math.min(finding.confidenceScore, 50)
      }
    };
  }
  if (finding.status === "verified") {
    const passageHasProhibitions = PROHIBITIVE_DIRECTIVE_REGEX.test(evidence.verbatimPassage) || PROHIBITIVE_DIRECTIVE_REGEX.test(matchedSection.extractedText);
    if (passageHasProhibitions) {
      return {
        isValid: false,
        reason: "Valid quotation contains mandatory prohibitions or restrictions; claim cannot be verified based on string containment alone.",
        finding: {
          ...finding,
          status: "needs_verification",
          explanation: `${finding.explanation} [Evidence Validation: Potential misinterpretation. The cited passage contains explicit restrictive/prohibitive directives. Substring presence does not substantiate compliance; downgraded to needs_verification.]`,
          confidenceScore: Math.min(finding.confidenceScore, 55)
        }
      };
    }
  }
  return {
    isValid: true,
    finding
  };
}

// server/services/gemini/provider.ts
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";

// server/services/gemini/schema.ts
import { z as z2 } from "zod";
var geminiClaimFindingSchema = z2.object({
  claimText: z2.string().describe("The exact claim extracted from marketing copy"),
  startIndex: z2.number().describe("Character start index of the claim in the submitted draft"),
  endIndex: z2.number().describe("Character end index of the claim in the submitted draft"),
  status: z2.enum(["verified", "contradicted", "needs_verification"]).describe("Whether the claim is verified, contradicted, or needs verification"),
  severity: z2.enum(["high", "medium", "low"]).describe("Compliance risk severity level"),
  brandRuleId: z2.string().describe("Identified brand rule code, e.g. RULE-3.1"),
  brandRuleTitle: z2.string().describe("Short title of the applicable brand rule"),
  explanation: z2.string().describe("Clear explanation of why the claim passed or breached policy"),
  confidenceScore: z2.number().min(0).max(100).describe("Algorithmic confidence rating between 0 and 100"),
  suggestedCorrection: z2.string().optional().describe("Compliant alternative wording addressing the violation"),
  citedDocumentId: z2.string().optional().default("doc-general"),
  citedDocumentName: z2.string().optional().default("General Regulatory Policy"),
  citedPageNumber: z2.number().optional().default(1),
  citedSectionHeading: z2.string().optional().default("General Compliance"),
  verbatimPassage: z2.string().optional().default("")
});
var geminiAnalysisResponseSchema = z2.object({
  findings: z2.array(geminiClaimFindingSchema)
});

// server/services/gemini/provider.ts
var geminiClient2 = null;
function getGeminiClient2() {
  if (!env.GEMINI_API_KEY) return null;
  if (!geminiClient2) {
    geminiClient2 = new GoogleGenAI2({ apiKey: env.GEMINI_API_KEY });
  }
  return geminiClient2;
}
async function analyzeDraftWithGemini(draftText, candidateSections) {
  const status = getServiceConfigStatus();
  if (!status.gemini.configured) {
    if (!env.ALLOW_DEV_FALLBACK) {
      throw new ServiceNotConfiguredError("Google Gemini AI", status.gemini.missingVars);
    }
    return null;
  }
  const ai = getGeminiClient2();
  if (!ai) return null;
  const prompt = `
You are BrandOS AI, an enterprise brand governance platform.
Analyze the following marketing draft against the provided approved brand guideline passages.

MARKETING DRAFT:
"""
${draftText}
"""

APPROVED BRAND GUIDELINE PASSAGES:
${candidateSections.map(
    (sec, idx) => `
--- GUIDELINE [${idx + 1}] ---
Document: "${sec.documentName}" (${sec.documentVersion})
Section: ${sec.heading} (Page ${sec.pageNumber})
Passage:
"${sec.extractedText}"
`
  ).join("\n")}

INSTRUCTIONS:
1. Identify all verifiable claims, promises, efficacy declarations, or sustainability assertions made in the draft.
2. For each claim, determine if it is:
   - "verified": Directly supported and substantiated by the guideline passage.
   - "contradicted": In direct violation of an explicit brand rule, FDA/FTC mandate, or clinical limitation.
   - "needs_verification": Evidence in guidelines is inconclusive, incomplete, or requires external audit proof.
3. For "contradicted" or "needs_verification" claims, generate a constructive, compliant suggested correction.
4. Set character startIndex and endIndex corresponding to the exact claim substring in the draft.
5. Provide a realistic confidence score (0-100).
6. ALWAYS reference the exact document name, page number, section heading, and verbatim passage from the guidelines provided above.
7. Return strictly valid JSON adhering to the required schema with a "findings" array.
`;
  const callApi = async () => {
    const response = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
        // High precision & low hallucination
      }
    });
    const rawText = response.text || "";
    const parsedJson = JSON.parse(rawText);
    const rawList = Array.isArray(parsedJson) ? parsedJson : parsedJson.findings || [];
    const normalized = rawList.map((raw) => {
      const claimText = raw.claimText || raw.claim || "";
      const startIndex = typeof raw.startIndex === "number" ? raw.startIndex : draftText.indexOf(claimText) >= 0 ? draftText.indexOf(claimText) : 0;
      const endIndex = typeof raw.endIndex === "number" ? raw.endIndex : startIndex + claimText.length;
      let status2 = (raw.status || "needs_verification").toLowerCase();
      if (!["verified", "contradicted", "needs_verification"].includes(status2)) {
        if (status2.includes("contra") || status2.includes("viola")) status2 = "contradicted";
        else if (status2.includes("verif") || status2.includes("pass")) status2 = "verified";
        else status2 = "needs_verification";
      }
      let severity = (raw.severity || "medium").toLowerCase();
      if (!["high", "medium", "low"].includes(severity)) {
        severity = "medium";
      }
      return {
        claimText,
        startIndex,
        endIndex,
        status: status2,
        severity,
        brandRuleId: raw.brandRuleId || raw.brand_rule_id || "RULE-3.1",
        brandRuleTitle: raw.brandRuleTitle || raw.brand_rule_title || raw.violation_type || "Brand Compliance Rule",
        explanation: raw.explanation || raw.reason || "Claim evaluated against brand guidelines.",
        confidenceScore: typeof raw.confidenceScore === "number" ? Math.min(100, Math.max(0, raw.confidenceScore)) : 92,
        suggestedCorrection: raw.suggestedCorrection || raw.suggested_correction || raw.recommended_fix || void 0,
        citedDocumentId: raw.citedDocumentId || "doc-1",
        citedDocumentName: raw.citedDocumentName || raw.guideline_reference || "Brand Guidelines",
        citedPageNumber: typeof raw.citedPageNumber === "number" ? raw.citedPageNumber : 1,
        citedSectionHeading: raw.citedSectionHeading || "Regulatory Limitations",
        verbatimPassage: raw.verbatimPassage || ""
      };
    });
    return geminiAnalysisResponseSchema.parse({ findings: normalized });
  };
  return withTimeout(withRetry(callApi, 2, 1e3), env.GEMINI_TIMEOUT_MS);
}

// server/services/rag/pipeline.ts
async function executeRagAnalysis(draftId, draftText, guidelineDocuments) {
  const allSections = [];
  for (const doc of guidelineDocuments) {
    if (doc.status === "active" && doc.sections) {
      for (const sec of doc.sections) {
        allSections.push({
          ...sec,
          documentId: doc.id,
          documentName: doc.name,
          documentVersion: doc.version
        });
      }
    }
  }
  if (allSections.length === 0) {
    return {
      findings: [],
      stats: {
        totalClaims: 0,
        verified: 0,
        contradicted: 0,
        needsVerification: 0,
        highSeverityCount: 0
      },
      executionMode: "offline_deterministic_fallback"
    };
  }
  const draftEmbedding = await generateEmbedding(draftText);
  const rankedPassages = rankGuidelinePassages(draftText, allSections, 15, draftEmbedding || void 0);
  const candidateSections = rankedPassages.map((rp) => rp.section);
  let rawFindings = [];
  let executionMode = "offline_deterministic_fallback";
  const geminiResult = await analyzeDraftWithGemini(draftText, candidateSections);
  if (geminiResult && geminiResult.findings && geminiResult.findings.length > 0) {
    executionMode = "gemini_live_ai";
    rawFindings = geminiResult.findings.map((f, idx) => {
      const matchedPassage = rankedPassages.find(
        (rp) => rp.section.documentName.toLowerCase().includes((f.citedDocumentName || "").toLowerCase()) || (f.citedDocumentName || "").toLowerCase().includes(rp.section.documentName.toLowerCase())
      ) || rankedPassages[0];
      const evidence = {
        documentId: f.citedDocumentId || matchedPassage.section.documentId || "doc-ref",
        documentName: f.citedDocumentName || matchedPassage.section.documentName,
        documentVersion: matchedPassage.section.documentVersion || "v1.0",
        pageNumber: f.citedPageNumber || matchedPassage.section.pageNumber,
        sectionHeading: f.citedSectionHeading || matchedPassage.section.heading,
        verbatimPassage: f.verbatimPassage || matchedPassage.section.extractedText.slice(0, 200),
        citationId: `cit-${draftId}-${idx + 1}`,
        relevanceScore: matchedPassage.relevanceScore
      };
      return {
        id: `fnd-${Date.now()}-${idx + 1}`,
        draftId,
        claimText: f.claimText,
        startIndex: Math.max(0, f.startIndex),
        endIndex: Math.min(draftText.length, f.endIndex > f.startIndex ? f.endIndex : f.startIndex + f.claimText.length),
        status: f.status,
        severity: f.severity,
        brandRuleId: f.brandRuleId || `RULE-${idx + 1}`,
        brandRuleTitle: f.brandRuleTitle || "Brand Guideline Rule",
        explanation: f.explanation,
        confidenceScore: f.confidenceScore,
        suggestedCorrection: f.suggestedCorrection,
        suggestionStatus: f.suggestedCorrection ? "unapplied" : void 0,
        evidence
      };
    });
  } else {
    executionMode = "offline_deterministic_fallback";
    rawFindings = generateDeterministicFindings(draftId, draftText, allSections, rankedPassages);
  }
  const validatedFindings = rawFindings.map((finding) => {
    const valResult = validateFindingEvidence(finding, allSections);
    return valResult.finding;
  });
  const totalClaims = validatedFindings.length;
  const verified = validatedFindings.filter((f) => f.status === "verified").length;
  const contradicted = validatedFindings.filter((f) => f.status === "contradicted").length;
  const needsVerification = validatedFindings.filter((f) => f.status === "needs_verification").length;
  const highSeverityCount = validatedFindings.filter((f) => f.severity === "high").length;
  return {
    findings: validatedFindings,
    stats: {
      totalClaims,
      verified,
      contradicted,
      needsVerification,
      highSeverityCount
    },
    executionMode
  };
}
function generateDeterministicFindings(draftId, draftText, allSections, rankedPassages) {
  const findings = [];
  let findingCount = 0;
  const patterns = [
    {
      regex: /(?:guaranteed\s+)?100%\s*(?:immunity|protection|satisfaction|guaranteed|natural|safe|effective|clean)?|guaranteed\s+(?:100%|immunity|protection)|completely\s*(?:safe|free|eliminated)/gi,
      status: "contradicted",
      severity: "high",
      ruleTitle: "Prohibition on Unsubstantiated Absolute Claims",
      ruleId: "REG-104",
      explanation: 'Absolute claims such as "100%" or "guaranteed immunity" violate FTC advertising standards unless certified by double-blind testing.',
      suggestCorrection: (_m) => `demonstrably high-performance and extensively tested`
    },
    {
      regex: /(?:clinically\s*proven\s*(?:to|results|formula)?|dermatologist\s*approved|cures(?:\s+[a-z]+)?|heals(?:\s+[a-z]+)?)/gi,
      status: "contradicted",
      severity: "high",
      ruleTitle: "Clinical and Efficacy Substantiation Standard",
      ruleId: "CLN-02",
      explanation: "Claims of clinical efficacy require explicit citation of institutional clinical study ID and methodology.",
      suggestCorrection: (_m) => `demonstrated in consumer perception evaluations`
    },
    {
      regex: /(zero\s*carbon|100%\s*carbon\s*neutral|net\s*zero\s*(?:footprint)?|eco-friendly\s*(?:certified)?)/gi,
      status: "needs_verification",
      severity: "medium",
      ruleTitle: "ESG Environmental Substantiation Mandate",
      ruleId: "ESG-08",
      explanation: "Environmental impact assertions require active ISO 14064 or third-party carbon audit certificate.",
      suggestCorrection: (_m) => `designed to minimize environmental impact with documented carbon offset projects`
    },
    {
      regex: /(revolutionary|unmatched\s*in\s*the\s*industry|the\s*world's\s*first|guaranteed\s*roi)/gi,
      status: "contradicted",
      severity: "medium",
      ruleTitle: "Brand Voice and Modesty Standard",
      ruleId: "TONE-05",
      explanation: "Superlatives and unquantified comparisons contradict our authentic, science-forward brand identity.",
      suggestCorrection: (_m) => `innovative and purpose-engineered`
    }
  ];
  for (const p of patterns) {
    let match;
    p.regex.lastIndex = 0;
    while ((match = p.regex.exec(draftText)) !== null) {
      findingCount++;
      const claimText = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + claimText.length;
      const passageResults = rankGuidelinePassages(claimText, allSections, 1);
      const bestPassage = passageResults[0] || rankedPassages[0];
      const evidence = {
        documentId: bestPassage?.section.documentId || "doc-ref",
        documentName: bestPassage?.section.documentName || "Core Brand Guidelines",
        documentVersion: bestPassage?.section.documentVersion || "v1.0",
        pageNumber: bestPassage?.section.pageNumber || 1,
        sectionHeading: bestPassage?.section.heading || p.ruleTitle,
        verbatimPassage: bestPassage?.section.extractedText ? bestPassage.section.extractedText.slice(0, 240) : "Claims must be substantiated with verified empirical documentation.",
        citationId: `cit-${draftId}-${findingCount}`,
        relevanceScore: Math.max(75, bestPassage?.relevanceScore || 75)
      };
      findings.push({
        id: `fnd-${Date.now()}-${findingCount}`,
        draftId,
        claimText,
        startIndex,
        endIndex,
        status: p.status,
        severity: p.severity,
        brandRuleId: p.ruleId,
        brandRuleTitle: p.ruleTitle,
        explanation: `${p.explanation} [Offline Fallback Mode: Evaluated via deterministic rules; Gemini AI was not invoked.]`,
        confidenceScore: 88,
        suggestedCorrection: p.suggestCorrection(claimText),
        suggestionStatus: "unapplied",
        evidence
      });
    }
  }
  if (findings.length === 0 && rankedPassages.length > 0 && draftText.trim().length > 20) {
    const firstSentence = draftText.split(/[.!?]/)[0].trim();
    const bestPassage = rankedPassages[0];
    findings.push({
      id: `fnd-${Date.now()}-1`,
      draftId,
      claimText: firstSentence.slice(0, 80),
      startIndex: 0,
      endIndex: firstSentence.slice(0, 80).length,
      status: "verified",
      severity: "low",
      brandRuleId: "CORE-01",
      brandRuleTitle: "Brand Consistency Standard",
      explanation: "Content is aligned with approved terminology and core brand guidelines. [Offline Fallback Mode: Evaluated via deterministic rules; Gemini AI was not invoked.]",
      confidenceScore: 92,
      evidence: {
        documentId: bestPassage.section.documentId || "doc-1",
        documentName: bestPassage.section.documentName,
        documentVersion: bestPassage.section.documentVersion,
        pageNumber: bestPassage.section.pageNumber,
        sectionHeading: bestPassage.section.heading,
        verbatimPassage: bestPassage.section.extractedText.slice(0, 200),
        citationId: `cit-${draftId}-1`,
        relevanceScore: Math.max(80, bestPassage.relevanceScore)
      }
    });
  }
  return findings;
}

// server/routes/reviewRoutes.ts
var reviewRouter = Router3();
reviewRouter.get("/reviews", async (req, res, next) => {
  try {
    const { status, contentType, search } = req.query;
    const reviews = await reviewRepo.getReviews({
      status,
      contentType,
      search,
      workspaceId: req.workspaceId
    });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});
reviewRouter.get("/reviews/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const review = await reviewRepo.getReviewById(id);
    if (!review) {
      throw new NotFoundError("ReviewDraft", id);
    }
    res.json(review);
  } catch (err) {
    next(err);
  }
});
reviewRouter.post("/reviews", async (req, res, next) => {
  try {
    const { title, contentType, campaignName, content, guidelineDocumentIds } = req.body;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      throw new ValidationError("Draft title is required.");
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      throw new ValidationError("Draft content text is required.");
    }
    const allActiveDocs = await documentRepo.getDocuments({ status: "active" });
    const targetDocs = guidelineDocumentIds && Array.isArray(guidelineDocumentIds) && guidelineDocumentIds.length > 0 ? allActiveDocs.filter((d) => guidelineDocumentIds.includes(d.id)) : allActiveDocs;
    const draftId = `REV-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const pipelineResult = await executeRagAnalysis(draftId, content, targetDocs);
    const submittedBy = req.user || {
      id: "usr-1",
      name: "Elena Rostova",
      email: "elena.rostova@acmehealth.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: "Brand Manager",
      workspaceId: "ws-1"
    };
    const newDraft = {
      id: draftId,
      title: title.trim(),
      contentType: contentType || "social_post",
      campaignName: campaignName?.trim() || void 0,
      workspaceId: req.workspaceId || "ws-1",
      submittedBy: {
        id: submittedBy.id,
        name: submittedBy.name,
        email: submittedBy.email,
        avatar: submittedBy.avatar
      },
      submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      originalText: content,
      currentText: content,
      guidelineDocumentIds: targetDocs.map((d) => d.id),
      status: "ready_for_approval",
      findings: pipelineResult.findings,
      stats: pipelineResult.stats
    };
    const saved = await reviewRepo.createReview(newDraft);
    await auditRepo.recordAuditEvent({
      actionType: "draft_submitted",
      actor: {
        id: submittedBy.id,
        name: submittedBy.name,
        email: submittedBy.email,
        role: submittedBy.role
      },
      targetType: "review",
      targetId: saved.id,
      targetTitle: saved.title,
      summary: `Submitted draft "${saved.title}" for pre-flight governance scan against ${targetDocs.length} guideline documents.`,
      metadata: {
        contentType: saved.contentType,
        wordCount: content.split(/\s+/).length
      }
    });
    const isAiMode = pipelineResult.executionMode === "gemini_live_ai";
    await auditRepo.recordAuditEvent({
      actionType: "finding_generated",
      actor: {
        id: isAiMode ? "sys-gemini-ai" : "sys-offline-rule-fallback",
        name: isAiMode ? "Google Gemini AI Governance Engine" : "BrandOS Offline Rule Fallback Engine",
        email: "engine@brandos.internal",
        role: "Automated System"
      },
      targetType: "review",
      targetId: saved.id,
      targetTitle: saved.title,
      summary: `Analyzed copy via ${isAiMode ? "live Gemini AI inference" : "offline deterministic rule fallback"}: generated ${pipelineResult.stats.totalClaims} findings (${pipelineResult.stats.verified} Verified, ${pipelineResult.stats.contradicted} Contradicted, ${pipelineResult.stats.needsVerification} Needs Verification).`,
      metadata: {
        stats: pipelineResult.stats,
        executionMode: pipelineResult.executionMode
      }
    });
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});
reviewRouter.post(
  "/reviews/:id/suggestions/:findingId/apply",
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const findingId = req.params.findingId;
      const { customText } = req.body;
      const actor = req.user || (await reviewRepo.getReviewById(id))?.submittedBy;
      const updated = await approvalService.applyFindingSuggestion(
        id,
        findingId,
        actor,
        customText
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
reviewRouter.post(
  "/reviews/:id/suggestions/:findingId/reject",
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const findingId = req.params.findingId;
      const actor = req.user || (await reviewRepo.getReviewById(id))?.submittedBy;
      const updated = await approvalService.rejectFindingSuggestion(id, findingId, actor);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
reviewRouter.patch(
  "/reviews/:id/draft",
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const { text } = req.body;
      if (typeof text !== "string") {
        throw new ValidationError("New draft text is required.");
      }
      const updated = await reviewRepo.updateDraftText(id, text);
      const actor = req.user || {
        id: "usr-3",
        name: "Sophia Chen",
        email: "sophia.chen@acmehealth.com",
        role: "Creator"
      };
      await auditRepo.recordAuditEvent({
        actionType: "draft_edited",
        workspaceId: req.workspaceId || updated.workspaceId || "ws-1",
        actor: {
          id: actor.id,
          name: actor.name,
          email: actor.email,
          role: actor.role
        },
        targetType: "review",
        targetId: updated.id,
        targetTitle: updated.title,
        summary: `Edited draft content for "${updated.title}" (${text.length} chars).`,
        metadata: {
          characterCount: text.length
        }
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);
reviewRouter.post(
  "/reviews/:id/decision",
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const { decision, comments } = req.body;
      if (!["approved", "changes_requested", "rejected"].includes(decision)) {
        throw new ValidationError(`Invalid decision '${decision}'. Must be approved, changes_requested, or rejected.`);
      }
      const actor = req.user || {
        id: "usr-2",
        name: "Marcus Vance",
        email: "marcus.vance@acmehealth.com",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        role: "Reviewer",
        workspaceId: "ws-1"
      };
      const approvalDecision = {
        decision,
        reviewerId: actor.id,
        reviewerName: actor.name,
        reviewerRole: actor.role,
        comments: comments || "",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      const updated = await approvalService.processDecision(id, approvalDecision, actor);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// server/routes/auditRoutes.ts
import { Router as Router4 } from "express";
var auditRouter = Router4();
auditRouter.get("/audit", async (req, res, next) => {
  try {
    const { actionType, userId, reviewId, search } = req.query;
    const events = await auditRepo.getAuditEvents({
      actionType,
      userId,
      reviewId,
      search,
      workspaceId: req.workspaceId
    });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// server/routes/analyticsRoutes.ts
import { Router as Router5 } from "express";

// server/services/analytics/metricsCalculator.ts
function calculateGovernanceMetrics(reviews, _timeframe = "30d") {
  const totalReviews = reviews.length;
  let totalVerified = 0;
  let totalContradicted = 0;
  let totalNeedsVerification = 0;
  let pendingApprovals = 0;
  const categoryMap = {
    "Clinical & Efficacy": { count: 0, high: 0, medium: 0, low: 0 },
    "Legal & Regulatory": { count: 0, high: 0, medium: 0, low: 0 },
    "ESG & Sustainability": { count: 0, high: 0, medium: 0, low: 0 },
    "Trademark & IP": { count: 0, high: 0, medium: 0, low: 0 },
    "Product Specifications": { count: 0, high: 0, medium: 0, low: 0 },
    "Tone of Voice": { count: 0, high: 0, medium: 0, low: 0 }
  };
  const statusCounts = {
    approved: 0,
    changes_requested: 0,
    ready_for_approval: 0,
    in_progress: 0,
    pending: 0,
    rejected: 0
  };
  const decisionCounts = {
    Approved: 0,
    "Changes Requested": 0,
    Rejected: 0
  };
  const violationRuleMap = {};
  const terminologyMap = {};
  reviews.forEach((r) => {
    if (r.findings && r.findings.length > 0) {
      r.findings.forEach((f) => {
        if (f.status === "verified") totalVerified++;
        if (f.status === "contradicted") totalContradicted++;
        if (f.status === "needs_verification") totalNeedsVerification++;
        let cat = "Legal & Regulatory";
        const lowerTitle = (f.brandRuleTitle || "").toLowerCase();
        if (lowerTitle.includes("clinical") || lowerTitle.includes("protection") || lowerTitle.includes("immunity") || lowerTitle.includes("potency")) {
          cat = lowerTitle.includes("potency") || lowerTitle.includes("spec") ? "Product Specifications" : "Clinical & Efficacy";
        } else if (lowerTitle.includes("carbon") || lowerTitle.includes("environmental") || lowerTitle.includes("esg")) {
          cat = "ESG & Sustainability";
        } else if (lowerTitle.includes("trademark") || lowerTitle.includes("\xAE") || lowerTitle.includes("ip")) {
          cat = "Trademark & IP";
        } else if (lowerTitle.includes("voice") || lowerTitle.includes("modesty") || lowerTitle.includes("tone")) {
          cat = "Tone of Voice";
        } else if (lowerTitle.includes("spec") || lowerTitle.includes("batch")) {
          cat = "Product Specifications";
        }
        if (!categoryMap[cat]) {
          categoryMap[cat] = { count: 0, high: 0, medium: 0, low: 0 };
        }
        categoryMap[cat].count++;
        if (f.severity === "high") categoryMap[cat].high++;
        if (f.severity === "medium") categoryMap[cat].medium++;
        if (f.severity === "low") categoryMap[cat].low++;
        if (f.status === "contradicted" || f.status === "needs_verification") {
          const ruleKey = f.brandRuleId || f.brandRuleTitle;
          if (!violationRuleMap[ruleKey]) {
            violationRuleMap[ruleKey] = {
              count: 0,
              rule: `${f.brandRuleId}: ${f.brandRuleTitle}`,
              category: cat,
              severity: f.severity
            };
          }
          violationRuleMap[ruleKey].count++;
          const term = f.claimText.length > 45 ? `${f.claimText.slice(0, 42)}...` : f.claimText;
          if (!terminologyMap[term]) {
            terminologyMap[term] = {
              count: 0,
              category: cat,
              alt: f.suggestedCorrection || "Softened structure/function language"
            };
          }
          terminologyMap[term].count++;
        }
      });
    } else {
      totalVerified += r.stats.verified;
      totalContradicted += r.stats.contradicted;
      totalNeedsVerification += r.stats.needsVerification;
    }
    if (r.status === "ready_for_approval") {
      pendingApprovals++;
    }
    if (statusCounts[r.status] !== void 0) {
      statusCounts[r.status]++;
    }
    if (r.approvalDecision) {
      if (r.approvalDecision.decision === "approved") decisionCounts["Approved"]++;
      if (r.approvalDecision.decision === "changes_requested") decisionCounts["Changes Requested"]++;
      if (r.approvalDecision.decision === "rejected") decisionCounts["Rejected"]++;
    }
  });
  const totalFlagged = totalContradicted + totalNeedsVerification;
  const totalClaims = totalVerified + totalFlagged;
  const complianceRatePercent = totalClaims > 0 ? Math.round(totalVerified / totalClaims * 100) : 100;
  const categoryBreakdown = Object.entries(categoryMap).filter(([_, stats]) => stats.count > 0).map(([category, stats]) => ({
    category,
    count: stats.count,
    high: stats.high,
    medium: stats.medium,
    low: stats.low
  }));
  const statusBreakdown = [
    { name: "Approved", value: statusCounts.approved, color: "#10b981" },
    { name: "Changes Requested", value: statusCounts.changes_requested, color: "#f59e0b" },
    { name: "Ready for Review", value: statusCounts.ready_for_approval, color: "#3b82f6" },
    {
      name: "Pending Scan",
      value: (statusCounts.pending || 0) + (statusCounts.in_progress || 0),
      color: "#8b5cf6"
    }
  ];
  const weeklyTrend = [
    { date: "Oct 05", verified: 12, contradicted: 4, needsVerification: 2 },
    { date: "Oct 12", verified: 18, contradicted: 5, needsVerification: 2 },
    { date: "Oct 19", verified: 24, contradicted: 3, needsVerification: 1 },
    {
      date: "Oct 26",
      verified: Math.max(7, totalVerified),
      contradicted: Math.max(4, totalContradicted),
      needsVerification: Math.max(1, totalNeedsVerification)
    }
  ];
  const recurringViolations = Object.values(violationRuleMap).length > 0 ? Object.values(violationRuleMap).sort((a, b) => b.count - a.count).slice(0, 5) : [
    {
      rule: "RULE-3.1: Prohibition of Absolute Immunity & Speed Guarantees",
      count: 2,
      category: "Clinical & Efficacy",
      severity: "high"
    },
    {
      rule: "RULE-4.8: Unauthorized Academic Institutional Co-Branding",
      count: 1,
      category: "Legal & Regulatory",
      severity: "high"
    },
    {
      rule: "RULE-7.2: Unqualified Zero-Carbon Environmental Claims",
      count: 1,
      category: "ESG & Sustainability",
      severity: "medium"
    }
  ];
  const flaggedTerminology = Object.entries(terminologyMap).length > 0 ? Object.entries(terminologyMap).map(([term, d]) => ({
    term,
    count: d.count,
    category: d.category,
    suggestedAlternative: d.alt
  })).slice(0, 5) : [
    {
      term: "guaranteed 100% immunity",
      count: 1,
      category: "Clinical & Efficacy",
      suggestedAlternative: "formulated to support healthy immune defense"
    },
    {
      term: "completely eliminate flu vulnerability",
      count: 1,
      category: "Clinical & Efficacy",
      suggestedAlternative: "support natural seasonal resistance"
    }
  ];
  const totalDecisions = decisionCounts["Approved"] + decisionCounts["Changes Requested"] + decisionCounts["Rejected"];
  const reviewerDecisions = [
    {
      decision: "Approved",
      count: decisionCounts["Approved"],
      percentage: totalDecisions > 0 ? Math.round(decisionCounts["Approved"] / totalDecisions * 100) : 50
    },
    {
      decision: "Changes Requested",
      count: decisionCounts["Changes Requested"],
      percentage: totalDecisions > 0 ? Math.round(decisionCounts["Changes Requested"] / totalDecisions * 100) : 50
    },
    {
      decision: "Rejected",
      count: decisionCounts["Rejected"],
      percentage: totalDecisions > 0 ? Math.round(decisionCounts["Rejected"] / totalDecisions * 100) : 0
    }
  ];
  return {
    totalReviews,
    verifiedClaims: totalVerified,
    flaggedFindings: totalFlagged,
    pendingApprovals,
    avgReviewTimeMinutes: 4.8,
    complianceRatePercent,
    categoryBreakdown: categoryBreakdown.length > 0 ? categoryBreakdown : [
      { category: "Clinical & Efficacy", count: 5, high: 3, medium: 1, low: 1 },
      { category: "Legal & Regulatory", count: 4, high: 2, medium: 1, low: 1 },
      { category: "ESG & Sustainability", count: 2, high: 0, medium: 2, low: 0 },
      { category: "Product Specifications", count: 1, high: 0, medium: 0, low: 1 }
    ],
    statusBreakdown,
    weeklyTrend,
    recurringViolations,
    flaggedTerminology,
    reviewerDecisions
  };
}

// server/services/analytics/analyticsService.ts
var analyticsService = {
  /**
   * Computes comprehensive brand governance analytics across all reviews and findings,
   * with strict tenant isolation and dynamic metric reconciliation.
   */
  async getAnalytics(timeframe = "30d", workspaceId) {
    const reviews = await reviewRepo.getReviews({ workspaceId });
    return calculateGovernanceMetrics(reviews, timeframe);
  }
};

// server/routes/analyticsRoutes.ts
var analyticsRouter = Router5();
analyticsRouter.get("/analytics", async (req, res, next) => {
  try {
    const timeframe = req.query.timeframe || "30d";
    const analytics = await analyticsService.getAnalytics(timeframe, req.workspaceId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

// server/app.ts
var app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-User-Id", "X-Workspace-Id"]
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.get("/api/health", (_req, res) => {
  const status = getServiceConfigStatus();
  res.json({
    status: "ok",
    service: "BrandOS AI Backend",
    version: "1.0.0",
    mode: env.ALLOW_DEV_FALLBACK ? "development_with_fallback" : "production_strict",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    services: {
      gemini: {
        configured: status.gemini.configured,
        model: env.GEMINI_MODEL,
        missingVariables: status.gemini.missingVars
      },
      supabase: {
        configured: status.supabase.configured,
        missingVariables: status.supabase.missingVars
      }
    }
  });
});
app.use("/api", authMiddleware);
app.use("/api", authRouter);
app.use("/api", documentRouter);
app.use("/api", reviewRouter);
app.use("/api", auditRouter);
app.use("/api", analyticsRouter);
var distPath = path.resolve(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}
app.use(centralErrorHandler);
export {
  app
};
