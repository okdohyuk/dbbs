-- Seed for the demo PostgreSQL source (database `pgtest` on pg-a).
CREATE TABLE IF NOT EXISTS widgets (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  qty   INTEGER NOT NULL DEFAULT 0,
  added TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO widgets (name, qty) VALUES
  ('alpha', 10),
  ('beta', 20),
  ('gamma', 30);

CREATE OR REPLACE VIEW widget_totals AS
  SELECT count(*) AS items, COALESCE(sum(qty), 0) AS total_qty FROM widgets;
