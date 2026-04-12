-- Add richer traffic classification fields for lightweight telemetry.
ALTER TABLE request_log ADD COLUMN host TEXT NOT NULL DEFAULT '';
ALTER TABLE request_log ADD COLUMN traffic_type TEXT NOT NULL DEFAULT 'api_client';
ALTER TABLE request_log ADD COLUMN ua_family TEXT NOT NULL DEFAULT '';

ALTER TABLE page_views ADD COLUMN host TEXT NOT NULL DEFAULT '';
ALTER TABLE page_views ADD COLUMN traffic_type TEXT NOT NULL DEFAULT 'human_browser';
ALTER TABLE page_views ADD COLUMN ua_family TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_request_log_traffic_type ON request_log(traffic_type);
CREATE INDEX IF NOT EXISTS idx_page_views_traffic_type ON page_views(traffic_type);
CREATE INDEX IF NOT EXISTS idx_page_views_host ON page_views(host);
