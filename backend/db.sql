-- ================================================================
-- 1. SCHEMA CREATION
-- ================================================================
-- 1.1 Users
CREATE TABLE users (
  id           text      PRIMARY KEY,
  name         text      NOT NULL,
  email        text      NOT NULL UNIQUE,
  password_hash text     NOT NULL,
  avatar_url   text,
  notify_in_app boolean  NOT NULL DEFAULT true,
  created_at   text      NOT NULL,
  updated_at   text      NOT NULL
);

-- 1.2 Workspaces
CREATE TABLE workspaces (
  id          text     PRIMARY KEY,
  name        text     NOT NULL,
  created_by  text     NOT NULL REFERENCES users(id),
  created_at  text     NOT NULL,
  updated_at  text     NOT NULL
);

-- 1.3 Workspace Members
CREATE TABLE workspace_members (
  id            text     PRIMARY KEY,
  workspace_id  text     NOT NULL REFERENCES workspaces(id),
  user_id       text     NOT NULL REFERENCES users(id),
  role          text     NOT NULL,
  joined_at     text     NOT NULL,
  UNIQUE (workspace_id, user_id)
);

-- 1.4 Workspace Invites
CREATE TABLE workspace_invites (
  id           text     PRIMARY KEY,
  workspace_id text     NOT NULL REFERENCES workspaces(id),
  email        text     NOT NULL,
  token        text     NOT NULL UNIQUE,
  invited_by   text     NOT NULL REFERENCES users(id),
  status       text     NOT NULL DEFAULT 'pending',
  created_at   text     NOT NULL,
  responded_at text
);

-- 1.5 Email Verification Tokens
CREATE TABLE email_verification_tokens (
  id         text     PRIMARY KEY,
  user_id    text     NOT NULL REFERENCES users(id),
  token      text     NOT NULL UNIQUE,
  expires_at text     NOT NULL,
  created_at text     NOT NULL,
  used_at    text
);

-- 1.6 Password Reset Tokens
CREATE TABLE password_reset_tokens (
  id         text     PRIMARY KEY,
  user_id    text     NOT NULL REFERENCES users(id),
  token      text     NOT NULL UNIQUE,
  expires_at text     NOT NULL,
  created_at text     NOT NULL,
  used_at    text
);

-- 1.7 Email Change Requests
CREATE TABLE email_change_requests (
  id            text     PRIMARY KEY,
  user_id       text     NOT NULL REFERENCES users(id),
  new_email     text     NOT NULL,
  token         text     NOT NULL UNIQUE,
  status        text     NOT NULL DEFAULT 'pending',
  created_at    text     NOT NULL,
  expires_at    text     NOT NULL,
  confirmed_at  text
);

-- 1.8 Projects
CREATE TABLE projects (
  id            text     PRIMARY KEY,
  workspace_id  text     NOT NULL REFERENCES workspaces(id),
  name          text     NOT NULL,
  description   text,
  color         text     NOT NULL,
  is_archived   boolean  NOT NULL DEFAULT false,
  archived_at   text,
  created_by    text     NOT NULL REFERENCES users(id),
  created_at    text     NOT NULL,
  updated_at    text     NOT NULL
);

-- 1.9 Sections
CREATE TABLE sections (
  id          text    PRIMARY KEY,
  project_id  text    NOT NULL REFERENCES projects(id),
  name        text    NOT NULL,
  order       integer NOT NULL,
  created_at  text    NOT NULL,
  updated_at  text    NOT NULL
);

-- 1.10 Tasks (and Subtasks)
CREATE TABLE tasks (
  id             text    PRIMARY KEY,
  project_id     text    NOT NULL REFERENCES projects(id),
  section_id     text    REFERENCES sections(id),
  parent_task_id text    REFERENCES tasks(id),
  title          text    NOT NULL,
  description    text,
  status         text    NOT NULL,
  priority       text    NOT NULL,
  due_date       text,
  order          integer NOT NULL,
  created_by     text    NOT NULL REFERENCES users(id),
  created_at     text    NOT NULL,
  updated_at     text    NOT NULL
);

-- 1.11 Task Assignments
CREATE TABLE task_assignments (
  id          text     PRIMARY KEY,
  task_id     text     NOT NULL REFERENCES tasks(id),
  user_id     text     NOT NULL REFERENCES users(id),
  assigned_by text     NOT NULL REFERENCES users(id),
  assigned_at text     NOT NULL,
  UNIQUE (task_id, user_id)
);

-- 1.12 Comments
CREATE TABLE comments (
  id         text    PRIMARY KEY,
  task_id    text    NOT NULL REFERENCES tasks(id),
  author_id  text    NOT NULL REFERENCES users(id),
  content    text    NOT NULL,
  created_at text    NOT NULL
);

-- 1.13 Attachments
CREATE TABLE attachments (
  id          text    PRIMARY KEY,
  task_id     text    NOT NULL REFERENCES tasks(id),
  file_name   text    NOT NULL,
  file_url    text    NOT NULL,
  file_size   integer NOT NULL,
  uploaded_by text    NOT NULL REFERENCES users(id),
  uploaded_at text    NOT NULL
);

-- 1.14 Notifications
CREATE TABLE notifications (
  id           text     PRIMARY KEY,
  user_id      text     NOT NULL REFERENCES users(id),
  type         text     NOT NULL,
  task_id      text     NOT NULL REFERENCES tasks(id),
  comment_id   text     REFERENCES comments(id),
  triggered_by text     NOT NULL REFERENCES users(id),
  is_read      boolean  NOT NULL DEFAULT false,
  created_at   text     NOT NULL
);

-- 1.15 Activity Logs
CREATE TABLE activity_logs (
  id         text    PRIMARY KEY,
  task_id    text    NOT NULL REFERENCES tasks(id),
  user_id    text    NOT NULL REFERENCES users(id),
  action     text    NOT NULL,
  metadata   json,
  created_at text    NOT NULL
);

-- ================================================================
-- 2. INDEXES
-- ================================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workspace_members_ws_user ON workspace_members(workspace_id, user_id);
CREATE INDEX idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX idx_evt_token ON email_verification_tokens(token);
CREATE INDEX idx_prt_token ON password_reset_tokens(token);
CREATE INDEX idx_ecr_token ON email_change_requests(token);
CREATE INDEX idx_projects_ws ON projects(workspace_id);
CREATE INDEX idx_sections_proj ON sections(project_id);
CREATE INDEX idx_tasks_proj ON tasks(project_id);
CREATE INDEX idx_tasks_section ON tasks(section_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_ta_task_user ON task_assignments(task_id, user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_logs_task ON activity_logs(task_id);

-- ================================================================
-- 3. SEED DATA
-- ================================================================
-- 3.1 Users
INSERT INTO users (id, name, email, password_hash, avatar_url, notify_in_app, created_at, updated_at) VALUES
  ('u1', 'Alice',   'alice@example.com',   'hashed_pwd_1', 'https://picsum.photos/seed/u1/200/200', true,  '2024-06-01T10:00:00Z', '2024-06-01T10:00:00Z'),
  ('u2', 'Bob',     'bob@example.com',     'hashed_pwd_2', 'https://picsum.photos/seed/u2/200/200', true,  '2024-06-02T11:00:00Z', '2024-06-02T11:00:00Z'),
  ('u3', 'Charlie', 'charlie@example.com', 'hashed_pwd_3', NULL,                                  false, '2024-06-03T12:00:00Z', '2024-06-03T12:00:00Z');

-- 3.2 Workspaces
INSERT INTO workspaces (id, name, created_by, created_at, updated_at) VALUES
  ('ws1', 'Marketing Team',   'u1', '2024-06-01T10:05:00Z', '2024-06-01T10:05:00Z'),
  ('ws2', 'Engineering Team', 'u2', '2024-06-02T11:10:00Z', '2024-06-02T11:10:00Z');

-- 3.3 Workspace Members
INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES
  ('wm1', 'ws1', 'u1', 'admin',  '2024-06-01T10:06:00Z'),
  ('wm2', 'ws1', 'u2', 'member', '2024-06-01T10:07:00Z'),
  ('wm3', 'ws1', 'u3', 'member', '2024-06-01T10:08:00Z'),
  ('wm4', 'ws2', 'u2', 'admin',  '2024-06-02T11:11:00Z'),
  ('wm5', 'ws2', 'u3', 'member', '2024-06-02T11:12:00Z');

-- 3.4 Workspace Invites
INSERT INTO workspace_invites (id, workspace_id, email, token, invited_by, status, created_at, responded_at) VALUES
  ('wi1', 'ws1', 'dave@example.com', 'invite_token_1', 'u1', 'pending',  '2024-06-01T10:09:00Z', NULL),
  ('wi2', 'ws2', 'eve@example.com',  'invite_token_2', 'u2', 'accepted', '2024-06-02T11:13:00Z', '2024-06-03T12:00:00Z');

-- 3.5 Email Verification Tokens
INSERT INTO email_verification_tokens (id, user_id, token, expires_at, created_at, used_at) VALUES
  ('evt1', 'u3', 'verify_token_u3', '2024-06-10T00:00:00Z', '2024-06-03T12:05:00Z', NULL),
  ('evt2', 'u2', 'verify_token_u2', '2024-06-09T00:00:00Z', '2024-06-02T11:15:00Z', '2024-06-02T11:20:00Z');

-- 3.6 Password Reset Tokens
INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at, used_at) VALUES
  ('prt1', 'u2', 'reset_token_u2', '2024-06-05T00:00:00Z', '2024-06-02T11:30:00Z', NULL),
  ('prt2', 'u1', 'reset_token_u1', '2024-06-06T00:00:00Z', '2024-06-01T10:15:00Z', '2024-06-01T10:20:00Z');

-- 3.7 Email Change Requests
INSERT INTO email_change_requests (id, user_id, new_email, token, status, created_at, expires_at, confirmed_at) VALUES
  ('ecr1', 'u3', 'charlie.new@example.com', 'email_change_token_u3', 'pending', '2024-06-03T12:10:00Z', '2024-06-10T12:00:00Z', NULL);

-- 3.8 Projects
INSERT INTO projects (id, workspace_id, name, description, color, is_archived, archived_at, created_by, created_at, updated_at) VALUES
  ('p1', 'ws1', 'Project Alpha', 'Plan the Q3 marketing campaign', '#FF0000', false, NULL, 'u1', '2024-06-01T10:10:00Z', '2024-06-01T10:10:00Z'),
  ('p2', 'ws1', 'Project Beta',  NULL,                          '#00FF00', true,  '2024-06-05T12:00:00Z', 'u1', '2024-06-02T10:00:00Z', '2024-06-05T12:00:00Z'),
  ('p3', 'ws2', 'Project Gamma','Develop new API endpoints',    '#0000FF', false, NULL, 'u2', '2024-06-02T11:20:00Z', '2024-06-02T11:20:00Z');

-- 3.9 Sections
INSERT INTO sections (id, project_id, name, order, created_at, updated_at) VALUES
  ('s1', 'p1', 'To Do',       1, '2024-06-01T10:11:00Z', '2024-06-01T10:11:00Z'),
  ('s2', 'p1', 'In Progress', 2, '2024-06-01T10:12:00Z', '2024-06-01T10:12:00Z'),
  ('s3', 'p1', 'Done',        3, '2024-06-01T10:13:00Z', '2024-06-01T10:13:00Z'),
  ('s4', 'p3', 'Backlog',     1, '2024-06-02T11:21:00Z', '2024-06-02T11:21:00Z'),
  ('s5', 'p3', 'Review',      2, '2024-06-02T11:22:00Z', '2024-06-02T11:22:00Z');

-- 3.10 Tasks & Subtasks
INSERT INTO tasks (id, project_id, section_id, parent_task_id, title, description, status, priority, due_date, order, created_by, created_at, updated_at) VALUES
  ('t1', 'p1', 's1', NULL,   'Design homepage',       'Create initial design for homepage', 'in_progress', 'high',   '2024-06-20T00:00:00Z', 1, 'u1', '2024-06-01T10:15:00Z', '2024-06-01T10:15:00Z'),
  ('t2', 'p1', 's1', NULL,   'Set up CI/CD',         'Configure CI/CD pipeline',           'in_progress', 'medium', '2024-06-25T00:00:00Z', 2, 'u1', '2024-06-01T10:16:00Z', '2024-06-01T10:16:00Z'),
  ('t3', 'p1', NULL, 't1',  'Draft wireframe',      NULL,                                  'completed',   'low',    NULL,                  1, 'u1', '2024-06-01T10:17:00Z', '2024-06-01T10:17:00Z'),
  ('t4', 'p3', 's4', NULL,   'Design API schema',    'Define DB and API schema',           'in_progress', 'high',   '2024-06-30T00:00:00Z', 1, 'u2', '2024-06-02T11:23:00Z', '2024-06-02T11:23:00Z'),
  ('t5', 'p3', 's4', NULL,   'Implement authentication', NULL,                             'in_progress', 'medium', '2024-07-05T00:00:00Z', 2, 'u2', '2024-06-02T11:24:00Z', '2024-06-02T11:24:00Z');

-- 3.11 Task Assignments
INSERT INTO task_assignments (id, task_id, user_id, assigned_by, assigned_at) VALUES
  ('ta1', 't1', 'u2', 'u1', '2024-06-01T10:20:00Z'),
  ('ta2', 't2', 'u3', 'u1', '2024-06-01T10:21:00Z'),
  ('ta3', 't3', 'u2', 'u1', '2024-06-01T10:22:00Z'),
  ('ta4', 't4', 'u3', 'u2', '2024-06-02T11:25:00Z');

-- 3.12 Comments
INSERT INTO comments (id, task_id, author_id, content, created_at) VALUES
  ('c1', 't1', 'u2', 'Looks good! Let me know if you need help.', '2024-06-01T10:23:00Z'),
  ('c2', 't3', 'u1', 'Wireframe completed.',                '2024-06-01T10:24:00Z'),
  ('c3', 't4', 'u2', 'Schema draft is ready for review.',    '2024-06-02T11:26:00Z');

-- 3.13 Attachments
INSERT INTO attachments (id, task_id, file_name, file_url, file_size, uploaded_by, uploaded_at) VALUES
  ('a1', 't1', 'homepage.png',      'https://picsum.photos/seed/a1/400/300', 102400, 'u1', '2024-06-01T10:25:00Z'),
  ('a2', 't2', 'ci_pipeline.docx',  'https://picsum.photos/seed/a2/600/400', 204800, 'u2', '2024-06-01T10:26:00Z');

-- 3.14 Notifications
INSERT INTO notifications (id, user_id, type, task_id, comment_id, triggered_by, is_read, created_at) VALUES
  ('n1', 'u2', 'assignment',          't1',  NULL,  'u1', false, '2024-06-01T10:27:00Z'),
  ('n2', 'u2', 'comment',             't1',  'c1', 'u2', false, '2024-06-01T10:28:00Z'),
  ('n3', 'u3', 'subtask_assignment',  't3',  NULL,  'u1', true,  '2024-06-01T10:29:00Z');

-- 3.15 Activity Logs
INSERT INTO activity_logs (id, task_id, user_id, action, metadata, created_at) VALUES
  ('al1', 't1', 'u1', 'created',         NULL,                                 '2024-06-01T10:30:00Z'),
  ('al2', 't1', 'u1', 'status_changed',  '{"old":"todo","new":"in_progress"}', '2024-06-01T10:31:00Z'),
  ('al3', 't3', 'u1', 'created',         NULL,                                 '2024-06-01T10:17:00Z'),
  ('al4', 't3', 'u2', 'commented',       '{"comment_id":"c2"}',               '2024-06-01T10:34:00Z'),
  ('al5', 't4', 'u2', 'created',         NULL,                                 '2024-06-02T11:23:00Z');