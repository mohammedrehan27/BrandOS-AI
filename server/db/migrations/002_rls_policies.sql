-- ==============================================================================
-- BrandOS AI — Migration 002: Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Helper: Retrieve current authenticated user's workspace ID
CREATE OR REPLACE FUNCTION auth_workspace_id()
RETURNS TEXT AS $$
    SELECT workspace_id FROM profiles WHERE id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Retrieve current authenticated user's role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 1. Workspaces Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own workspace"
    ON workspaces FOR SELECT
    USING (id = auth_workspace_id());

CREATE POLICY "Brand Managers can update their workspace"
    ON workspaces FOR UPDATE
    USING (id = auth_workspace_id() AND auth_user_role() = 'Brand Manager');

-- ------------------------------------------------------------------------------
-- 2. Profiles Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view profiles within their workspace"
    ON profiles FOR SELECT
    USING (workspace_id = auth_workspace_id());

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid()::text);

CREATE POLICY "Brand Managers can insert team profiles"
    ON profiles FOR INSERT
    WITH CHECK (workspace_id = auth_workspace_id() AND auth_user_role() = 'Brand Manager');

-- ------------------------------------------------------------------------------
-- 3. Brand Documents Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Workspace members can view active & archived guidelines"
    ON brand_documents FOR SELECT
    USING (workspace_id = auth_workspace_id());

CREATE POLICY "Brand Managers can upload brand guidelines"
    ON brand_documents FOR INSERT
    WITH CHECK (workspace_id = auth_workspace_id() AND auth_user_role() = 'Brand Manager');

CREATE POLICY "Brand Managers can update guideline metadata and status"
    ON brand_documents FOR UPDATE
    USING (workspace_id = auth_workspace_id() AND auth_user_role() = 'Brand Manager');

CREATE POLICY "Brand Managers can delete brand guidelines"
    ON brand_documents FOR DELETE
    USING (workspace_id = auth_workspace_id() AND auth_user_role() = 'Brand Manager');

-- ------------------------------------------------------------------------------
-- 4. Document Sections Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Workspace members can view document sections"
    ON document_sections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM brand_documents
            WHERE brand_documents.id = document_sections.document_id
            AND brand_documents.workspace_id = auth_workspace_id()
        )
    );

CREATE POLICY "Brand Managers can insert and manage document sections"
    ON document_sections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM brand_documents
            WHERE brand_documents.id = document_sections.document_id
            AND brand_documents.workspace_id = auth_workspace_id()
            AND auth_user_role() = 'Brand Manager'
        )
    );

-- ------------------------------------------------------------------------------
-- 5. Review Drafts Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Workspace members can view review drafts"
    ON review_drafts FOR SELECT
    USING (workspace_id = auth_workspace_id());

CREATE POLICY "Authenticated members can submit content review drafts"
    ON review_drafts FOR INSERT
    WITH CHECK (workspace_id = auth_workspace_id());

CREATE POLICY "Creators can edit draft before final decision; Reviewers can transition state"
    ON review_drafts FOR UPDATE
    USING (
        workspace_id = auth_workspace_id() AND (
            (submitted_by_id = auth.uid()::text AND status IN ('pending', 'changes_requested', 'ready_for_approval'))
            OR auth_user_role() IN ('Reviewer', 'Brand Manager')
        )
    );

-- ------------------------------------------------------------------------------
-- 6. Findings Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Workspace members can view findings"
    ON findings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM review_drafts
            WHERE review_drafts.id = findings.draft_id
            AND review_drafts.workspace_id = auth_workspace_id()
        )
    );

CREATE POLICY "Findings can be managed by workspace members"
    ON findings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM review_drafts
            WHERE review_drafts.id = findings.draft_id
            AND review_drafts.workspace_id = auth_workspace_id()
        )
    );

-- ------------------------------------------------------------------------------
-- 7. Approval Decisions Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Workspace members can view approval decisions"
    ON approval_decisions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM review_drafts
            WHERE review_drafts.id = approval_decisions.draft_id
            AND review_drafts.workspace_id = auth_workspace_id()
        )
    );

CREATE POLICY "Reviewers and Brand Managers can record approval decisions"
    ON approval_decisions FOR INSERT
    WITH CHECK (
        auth_user_role() IN ('Reviewer', 'Brand Manager') AND
        EXISTS (
            SELECT 1 FROM review_drafts
            WHERE review_drafts.id = approval_decisions.draft_id
            AND review_drafts.workspace_id = auth_workspace_id()
        )
    );

-- ------------------------------------------------------------------------------
-- 8. Audit Events Policies (Immutable Append-Only)
-- ------------------------------------------------------------------------------
CREATE POLICY "Workspace members can view audit events"
    ON audit_events FOR SELECT
    USING (workspace_id = auth_workspace_id());

CREATE POLICY "Authenticated members can emit audit events"
    ON audit_events FOR INSERT
    WITH CHECK (workspace_id = auth_workspace_id());

-- Notice: NO UPDATE OR DELETE POLICIES CREATED FOR audit_events (Enforcing Immutability)
