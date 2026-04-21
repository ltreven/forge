-- Migration 0009: project management REST foundation (projects, updates, issues, activity)

CREATE TYPE project_health AS ENUM ('unknown', 'on_track', 'at_risk', 'off_track');

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  short_summary TEXT,
  description_markdown TEXT,
  description_rich_text JSONB,
  start_date_kind TEXT,
  start_date_value TEXT,
  end_date_kind TEXT,
  end_date_value TEXT,
  status INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  lead_id UUID,
  health project_health NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT projects_status_domain CHECK (status BETWEEN 0 AND 4),
  CONSTRAINT projects_priority_domain CHECK (priority BETWEEN 0 AND 4)
);

CREATE TABLE project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_health project_health NOT NULL,
  new_health project_health NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_issue_id UUID REFERENCES project_issues(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  short_summary TEXT,
  description_markdown TEXT,
  description_rich_text JSONB,
  status INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  assigned_to_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_issues_status_domain CHECK (status BETWEEN 0 AND 4),
  CONSTRAINT project_issues_priority_domain CHECK (priority BETWEEN 0 AND 4)
);

CREATE TABLE project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_activities_entity_type_domain CHECK (entity_type IN ('project', 'issue', 'update')),
  CONSTRAINT project_activities_action_domain CHECK (action IN ('created', 'updated', 'deleted'))
);

CREATE INDEX projects_team_id_idx ON projects(team_id);
CREATE INDEX project_updates_project_id_idx ON project_updates(project_id);
CREATE INDEX project_issues_project_id_idx ON project_issues(project_id);
CREATE INDEX project_issues_parent_issue_id_idx ON project_issues(parent_issue_id);
CREATE INDEX project_activities_team_id_created_at_idx ON project_activities(team_id, created_at DESC);
