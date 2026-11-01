
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const dataDirectory = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDirectory, { recursive: true });

const databasePath = path.join(dataDirectory, "readings.db");
const db = new DatabaseSync(databasePath);

db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device TEXT NOT NULL,
        adc REAL NOT NULL,
        percentage REAL NOT NULL,
        voltage REAL NOT NULL,
        timestamp TEXT NOT NULL
    )
`);

const insertReading = db.prepare(`
    INSERT INTO readings (device, adc, percentage, voltage, timestamp)
    VALUES (?, ?, ?, ?, ?)
`);

function saveReading(reading) {
    insertReading.run(
        reading.device,
        reading.adc,
        reading.percentage,
        reading.voltage,
        reading.timestamp
    );
}

function getLatestReading() {
    const result = db.prepare(`
        SELECT * FROM readings
        ORDER BY id DESC
        LIMIT 1
    `).get();

    return result || null;
}

function getHistory(limit = 500) {
    const result = db.prepare(`
        SELECT * FROM readings
        ORDER BY id DESC
        LIMIT ?
    `).all(limit);

    return result.reverse();
}

// ----------------------------------
// GET HISTORY BY DATE RANGE
// ----------------------------------

function getHistoryByDate(startDate, endDate) {
    const result = db.prepare(`
        SELECT * FROM readings
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY id ASC
    `).all(startDate, endDate);

    return result;
}

// ----------------------------------
// GET ANALYTICS BY DATE RANGE
// ----------------------------------

function getAnalyticsByDate(startDate, endDate) {
    return db.prepare(`
        SELECT
            COUNT(*) AS totalReadings,
            AVG(percentage) AS averagePercentage,
            MIN(percentage) AS minimumPercentage,
            MAX(percentage) AS maximumPercentage,
            AVG(voltage) AS averageVoltage,
            MIN(voltage) AS minimumVoltage,
            MAX(voltage) AS maximumVoltage,
            AVG(adc) AS averageAdc,
            MIN(adc) AS minimumAdc,
            MAX(adc) AS maximumAdc
        FROM readings
        WHERE timestamp >= ? AND timestamp <= ?
    `).get(startDate, endDate);
}

// ----------------------------------
// GET ALL-TIME ANALYTICS
// ----------------------------------

function getAnalytics() {
    return db.prepare(`
        SELECT
            COUNT(*) AS totalReadings,
            AVG(percentage) AS averagePercentage,
            MIN(percentage) AS minimumPercentage,
            MAX(percentage) AS maximumPercentage,
            AVG(voltage) AS averageVoltage,
            MIN(voltage) AS minimumVoltage,
            MAX(voltage) AS maximumVoltage,
            AVG(adc) AS averageAdc,
            MIN(adc) AS minimumAdc,
            MAX(adc) AS maximumAdc
        FROM readings
    `).get();
}

module.exports = {
    saveReading,
    getLatestReading,
    getHistory,
    getAnalytics,
    getHistoryByDate,
    getAnalyticsByDate
};

console.log("SQLite database initialized:", databasePath);
