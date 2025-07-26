-- Bitcoin Price History Database Schema
-- SQLite database for storing historical Bitcoin price data

-- Main table for Bitcoin price history
CREATE TABLE IF NOT EXISTS bitcoin_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    timestamp INTEGER NOT NULL,
    open REAL NOT NULL,
    high REAL NOT NULL,
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL,
    source TEXT NOT NULL DEFAULT 'unknown',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast date-based queries
CREATE INDEX IF NOT EXISTS idx_bitcoin_prices_date ON bitcoin_prices(date);
CREATE INDEX IF NOT EXISTS idx_bitcoin_prices_timestamp ON bitcoin_prices(timestamp);

-- Table for tracking data updates and sources
CREATE TABLE IF NOT EXISTS data_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    update_date TEXT NOT NULL,
    records_added INTEGER NOT NULL DEFAULT 0,
    records_updated INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for API rate limiting and monitoring
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    last_request_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    rate_limit_reset_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for API monitoring
CREATE INDEX IF NOT EXISTS idx_api_usage_name_date ON api_usage(api_name, last_request_at);

-- View for latest price data
CREATE VIEW IF NOT EXISTS latest_prices AS
SELECT 
    date,
    timestamp,
    open,
    high,
    low,
    close,
    volume,
    source,
    created_at
FROM bitcoin_prices 
ORDER BY timestamp DESC 
LIMIT 100;

-- View for data completeness check
CREATE VIEW IF NOT EXISTS data_gaps AS
WITH date_series AS (
    SELECT date(min_date, '+' || (level-1) || ' days') as expected_date
    FROM (
        SELECT MIN(date) as min_date, 
               julianday(MAX(date)) - julianday(MIN(date)) + 1 as total_days
        FROM bitcoin_prices
    ),
    (WITH RECURSIVE series(level) AS (
        SELECT 1
        UNION ALL
        SELECT level + 1 
        FROM series 
        WHERE level < (SELECT julianday(MAX(date)) - julianday(MIN(date)) + 1 FROM bitcoin_prices)
    ) SELECT level FROM series)
)
SELECT ds.expected_date as missing_date
FROM date_series ds
LEFT JOIN bitcoin_prices bp ON ds.expected_date = bp.date
WHERE bp.date IS NULL
ORDER BY ds.expected_date;

-- Trigger to update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_bitcoin_prices_timestamp 
    AFTER UPDATE ON bitcoin_prices
BEGIN
    UPDATE bitcoin_prices 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;
