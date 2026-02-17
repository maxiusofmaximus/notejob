-- Knowledge repository expansion
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS knowledge_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('task', 'concept', 'guide')),
  title TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'researching', 'ready', 'archived')),
  domain TEXT NOT NULL DEFAULT 'other',
  engine TEXT NOT NULL DEFAULT 'none' CHECK (engine IN ('none', 'unity', 'unreal', 'both')),
  source_url TEXT,
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta')),
  is_project_idea INTEGER NOT NULL DEFAULT 0,
  next_action TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_user_id ON knowledge_items(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_status ON knowledge_items(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_domain ON knowledge_items(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_engine ON knowledge_items(engine);

CREATE TABLE IF NOT EXISTS guides (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL UNIQUE,
  content_md TEXT NOT NULL,
  export_version INTEGER NOT NULL DEFAULT 1,
  last_exported_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  mime_type TEXT,
  extension TEXT,
  media_type TEXT NOT NULL DEFAULT 'other',
  size_bytes INTEGER,
  sha256 TEXT,
  parsed_text TEXT,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_item_id ON attachments(item_id);
CREATE INDEX IF NOT EXISTS idx_attachments_media_type ON attachments(media_type);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  engine TEXT NOT NULL DEFAULT 'unity' CHECK (engine IN ('unity', 'unreal', 'both')),
  status TEXT NOT NULL DEFAULT 'ideation' CHECK (status IN ('ideation', 'research', 'prototype', 'active', 'paused', 'done')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_engine ON projects(engine);

CREATE TABLE IF NOT EXISTS project_knowledge_links (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'reference' CHECK (relation_type IN ('reference', 'inspiration', 'requirement', 'implementation')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_knowledge_unique ON project_knowledge_links(project_id, item_id, relation_type);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  icon TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (item_id, tag_id),
  FOREIGN KEY (item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_relations (
  id TEXT PRIMARY KEY,
  from_item_id TEXT NOT NULL,
  to_item_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'related' CHECK (relation_type IN ('related', 'requires', 'extends', 'duplicate', 'blocks')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE,
  FOREIGN KEY (to_item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_rel_unique ON knowledge_relations(from_item_id, to_item_id, relation_type);

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'web', 'pdf', 'docx', 'image', 'video', 'audio', 'other')),
  source_ref TEXT,
  summary TEXT,
  insights_json TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analyses_item_id ON analyses(item_id);
