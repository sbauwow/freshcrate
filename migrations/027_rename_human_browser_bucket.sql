-- Rename the `human_browser` traffic bucket to `browser_shaped`.
--
-- The old name claimed a fact the data never supported. It counted requests
-- whose headers are consistent with a browser engine; on 2026-08-06 that was
-- 13,226 hits/24h against 45 beacon page views, because clients that copy a
-- full Chrome header set without executing JavaScript are indistinguishable
-- from Chrome at the header layer. See lib/traffic-classification.ts.
--
-- Backfilled rather than left to age out so the 7d and since-boot windows stay
-- continuous across the rename instead of splitting one population into two
-- buckets for a month (request_log retention is 30 days).

UPDATE request_log SET traffic_type = 'browser_shaped' WHERE traffic_type = 'human_browser';
UPDATE page_views SET traffic_type = 'browser_shaped' WHERE traffic_type = 'human_browser';

-- NOTE: page_views.traffic_type still carries `DEFAULT 'human_browser'` from
-- migration 013. SQLite cannot alter a column default without rebuilding the
-- table, and the default is never exercised — /api/beacon always supplies
-- traffic_type explicitly. Left in place deliberately; rebuild the table only
-- if something starts inserting page_views without that column.
