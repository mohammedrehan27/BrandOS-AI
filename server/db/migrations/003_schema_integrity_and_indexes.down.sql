-- ==============================================================================
-- BrandOS AI — Migration 003 Rollback: Schema Integrity & Indexes
-- ==============================================================================

-- 1. Remove Audit Immutability Triggers
DROP TRIGGER IF EXISTS trigger_prevent_audit_delete ON audit_events;
DROP TRIGGER IF EXISTS trigger_prevent_audit_update ON audit_events;
DROP FUNCTION IF EXISTS prevent_audit_mutation();

-- 2. Revert NOT NULL constraints
ALTER TABLE audit_events ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE review_drafts ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE brand_documents ALTER COLUMN workspace_id DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN workspace_id DROP NOT NULL;

-- 3. Remove Check Constraint
ALTER TABLE approval_decisions DROP CONSTRAINT IF EXISTS check_approval_decision_type;

-- 4. Drop Indexes
DROP INDEX IF EXISTS idx_audit_events_action;
DROP INDEX IF EXISTS idx_audit_events_actor;
DROP INDEX IF EXISTS idx_audit_events_target;
DROP INDEX IF EXISTS idx_findings_status;
DROP INDEX IF EXISTS idx_findings_document_id;
DROP INDEX IF EXISTS idx_approval_decisions_reviewer;
DROP INDEX IF EXISTS idx_approval_decisions_draft;
DROP INDEX IF EXISTS idx_profiles_role;
DROP INDEX IF EXISTS idx_profiles_workspace_id;
