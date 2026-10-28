-- ==============================================================================
-- BrandOS AI — Migration 001: Initial Relational Schema
-- ==============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Custom Domain Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Brand Manager', 'Reviewer', 'Creator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_category AS ENUM (
        'Clinical & Efficacy',
        'Legal & Regulatory',
        'Product Specifications',
        'Tone of Voice',
        'ESG & Sustainability',
        'Trademark & IP'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE processing_status AS ENUM ('indexed', 'processing', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('active', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE content_type AS ENUM (
        'advertisement',
        'social_post',
        'landing_page',
        'email',
        'product_description',
        'press_release'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM (
        'pending',
        'in_progress',
        'changes_requested',
        'ready_for_approval',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE finding_status AS ENUM ('verified', 'contradicted', 'needs_verification');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE finding_severity AS ENUM ('high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE suggestion_status AS ENUM ('unapplied', 'applied', 'edited', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action_type AS ENUM (
        'draft_submitted',
        'guidelines_applied',
        'review_started',
        'review_completed',
        'finding_generated',
        'suggestion_accepted',
        'suggestion_edited',
        'suggestion_rejected',
        'comment_added',
        'approval_decision',
        'rejection_decision',
        'revisions_requested',
        'document_uploaded',
        'document_archived',
        'document_indexed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo TEXT,
    industry TEXT NOT NULL DEFAULT 'Enterprise SaaS',
    compliance_score NUMERIC(5,2) DEFAULT 90.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. User Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar TEXT,
    role user_role NOT NULL DEFAULT 'Creator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Brand Documents (Guidelines)
CREATE TABLE IF NOT EXISTS brand_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    category document_category NOT NULL,
    version TEXT NOT NULL DEFAULT 'v1.0',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    file_url TEXT,
    storage_path TEXT,
    status document_status NOT NULL DEFAULT 'active',
    processing_status processing_status NOT NULL DEFAULT 'processing',
    page_count INTEGER NOT NULL DEFAULT 1,
    extracted_rules_count INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    uploaded_by_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    uploaded_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Document Sections & Rule Passages (For RAG retrieval)
CREATE TABLE IF NOT EXISTS document_sections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id TEXT NOT NULL REFERENCES brand_documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL DEFAULT 1,
    heading TEXT NOT NULL,
    rule_count INTEGER NOT NULL DEFAULT 1,
    summary TEXT,
    extracted_text TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    embedding vector(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. Review Drafts
CREATE TABLE IF NOT EXISTS review_drafts (
    id TEXT PRIMARY KEY, -- e.g. REV-2025-089
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type content_type NOT NULL DEFAULT 'landing_page',
    campaign_name TEXT,
    original_text TEXT NOT NULL,
    current_text TEXT NOT NULL,
    guideline_document_ids TEXT[] DEFAULT '{}',
    status review_status NOT NULL DEFAULT 'pending',
    submitted_by_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    submitted_by_name TEXT NOT NULL,
    submitted_by_email TEXT NOT NULL,
    submitted_by_avatar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. Findings
CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    draft_id TEXT NOT NULL REFERENCES review_drafts(id) ON DELETE CASCADE,
    claim_text TEXT NOT NULL,
    start_index INTEGER NOT NULL,
    end_index INTEGER NOT NULL,
    status finding_status NOT NULL,
    severity finding_severity NOT NULL,
    brand_rule_id TEXT NOT NULL,
    brand_rule_title TEXT NOT NULL,
    explanation TEXT NOT NULL,
    confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
    suggested_correction TEXT,
    suggestion_status suggestion_status DEFAULT 'unapplied',
    edited_correction TEXT,
    -- Citations & ground-truth evidence
    document_id TEXT REFERENCES brand_documents(id) ON DELETE SET NULL,
    document_name TEXT NOT NULL,
    document_version TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    section_heading TEXT NOT NULL,
    verbatim_passage TEXT NOT NULL,
    citation_id TEXT NOT NULL,
    relevance_score INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. Approval Decisions
CREATE TABLE IF NOT EXISTS approval_decisions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    draft_id TEXT NOT NULL REFERENCES review_drafts(id) ON DELETE CASCADE,
    decision review_status NOT NULL,
    reviewer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_role TEXT NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. Audit Events Ledger (Immutable)
CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
    action_type audit_action_type NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_title TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_documents_workspace ON brand_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_brand_documents_status ON brand_documents(status);
CREATE INDEX IF NOT EXISTS idx_document_sections_doc ON document_sections(document_id);
CREATE INDEX IF NOT EXISTS idx_review_drafts_workspace ON review_drafts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_review_drafts_status ON review_drafts(status);
CREATE INDEX IF NOT EXISTS idx_findings_draft ON findings(draft_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace ON audit_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);

-- Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspaces_updated_at ON workspaces;
CREATE TRIGGER trigger_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trigger_brand_documents_updated_at ON brand_documents;
CREATE TRIGGER trigger_brand_documents_updated_at
    BEFORE UPDATE ON brand_documents
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS trigger_review_drafts_updated_at ON review_drafts;
CREATE TRIGGER trigger_review_drafts_updated_at
    BEFORE UPDATE ON review_drafts
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- HNSW Vector Index for sub-millisecond similarity search
CREATE INDEX IF NOT EXISTS idx_document_sections_embedding
    ON document_sections USING hnsw (embedding vector_cosine_ops);

-- Vector Cosine Distance Search Function for Enterprise RAG Retrieval
CREATE OR REPLACE FUNCTION match_document_sections (
    query_embedding vector(768),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id TEXT,
    document_id TEXT,
    page_number int,
    heading TEXT,
    summary TEXT,
    extracted_text TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ds.id,
        ds.document_id,
        ds.page_number,
        ds.heading,
        ds.summary,
        ds.extracted_text,
        (1 - (ds.embedding <=> query_embedding))::float AS similarity
    FROM document_sections ds
    WHERE ds.embedding IS NOT NULL
      AND (1 - (ds.embedding <=> query_embedding)) > match_threshold
    ORDER BY ds.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
