-- ==============================================================================
-- BrandOS AI — Migration 003: Schema Integrity, Performance Indexes & Audit Guard
-- Reversible migration: See 003_schema_integrity_and_indexes.down.sql for rollback
-- ==============================================================================

-- 1. High-Performance Query & Join Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id ON profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_approval_decisions_draft ON approval_decisions(draft_id);
CREATE INDEX IF NOT EXISTS idx_approval_decisions_reviewer ON approval_decisions(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_findings_document_id ON findings(document_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action_type);

-- 2. Domain Constraints
-- Restrict approval decisions strictly to approved, changes_requested, or rejected
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_approval_decision_type'
    ) THEN
        ALTER TABLE approval_decisions 
            ADD CONSTRAINT check_approval_decision_type 
            CHECK (decision IN ('approved', 'changes_requested', 'rejected'));
    END IF;
END $$;

-- 3. Tenant Foreign Key NOT NULL Constraints (Safe IF NULL handling)
-- Ensure default workspace fallback if existing legacy rows had NULL workspace_id
UPDATE profiles SET workspace_id = 'ws-1' WHERE workspace_id IS NULL;
UPDATE brand_documents SET workspace_id = 'ws-1' WHERE workspace_id IS NULL;
UPDATE review_drafts SET workspace_id = 'ws-1' WHERE workspace_id IS NULL;
UPDATE audit_events SET workspace_id = 'ws-1' WHERE workspace_id IS NULL;

ALTER TABLE profiles ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE brand_documents ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE review_drafts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE audit_events ALTER COLUMN workspace_id SET NOT NULL;

-- 4. Audit Log Immutability Enforcement
-- Prevent ANY UPDATE or DELETE on audit_events even with elevated permissions
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'BrandOS Security Alert: audit_events is an immutable append-only ledger. UPDATE and DELETE operations are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_audit_update ON audit_events;
CREATE TRIGGER trigger_prevent_audit_update
    BEFORE UPDATE ON audit_events
    FOR EACH ROW EXECUTE PROCEDURE prevent_audit_mutation();

DROP TRIGGER IF EXISTS trigger_prevent_audit_delete ON audit_events;
CREATE TRIGGER trigger_prevent_audit_delete
    BEFORE DELETE ON audit_events
    FOR EACH ROW EXECUTE PROCEDURE prevent_audit_mutation();

-- 5. Extend Audit Action Types
ALTER TYPE audit_action_type ADD VALUE IF NOT EXISTS 'draft_edited';
