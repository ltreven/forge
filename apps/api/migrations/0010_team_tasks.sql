-- Migration 0010: continuous team tasks (kanban tasks not linked to projects)

CREATE TABLE team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES team_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  short_summary TEXT,
  description_markdown TEXT,
  description_rich_text JSONB,
  status INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  assigned_to_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_tasks_status_domain CHECK (status BETWEEN 0 AND 4),
  CONSTRAINT team_tasks_priority_domain CHECK (priority BETWEEN 0 AND 4)
);

CREATE INDEX team_tasks_team_id_idx ON team_tasks(team_id);
CREATE INDEX team_tasks_parent_task_id_idx ON team_tasks(parent_task_id);
CREATE INDEX team_tasks_team_id_updated_at_idx ON team_tasks(team_id, updated_at DESC);
