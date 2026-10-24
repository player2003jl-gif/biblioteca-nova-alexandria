-- CF-01: estado no servidor, preservado entre deploys.
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  width INTEGER NOT NULL CHECK(width>0),
  height INTEGER NOT NULL CHECK(height>0),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS objects (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('bookshelf','crate')),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 48),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL CHECK(width>0),
  height INTEGER NOT NULL CHECK(height>0),
  movable INTEGER NOT NULL DEFAULT 0 CHECK(movable IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS objects_room_idx ON objects(room_id);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id),
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create','move','delete')),
  object_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  room_revision INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS audit_room_idx ON audit_log(room_id,room_revision);
INSERT OR IGNORE INTO rooms(id,name,width,height,revision)
VALUES ('main','Sala de Testes — Nova Alexandria',640,352,1);
INSERT OR IGNORE INTO objects(id,room_id,kind,name,x,y,width,height,movable)
VALUES ('estante-001','main','bookshelf','Estante provisória',172,36,168,44,0),
       ('caixote-001','main','crate','Caixote de teste',344,192,40,40,1);
