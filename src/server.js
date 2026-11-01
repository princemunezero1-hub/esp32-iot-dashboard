
require("dotenv").config();

const express = require("express");
const mqtt = require("mqtt");
const cors = require("cors");

const {
    saveReading,
    getLatestReading,
    getHistory,
    getAnalytics,
    getHistoryByDate,
    getAnalyticsByDate
} = require("./database");

const app = express();

const PORT = process.env.PORT || 3000;
const MQTT_BROKER = process.env.MQTT_BROKER;
const MQTT_TOPIC = process.env.MQTT_TOPIC;

app.use(cors());
app.use(express.json());

let mqttConnected = false;

// ------------------------------------
// MQTT CONNECTION
// ------------------------------------

const mqttClient = mqtt.connect(MQTT_BROKER, {
    clientId:
        "dashboard_backend_" +
        Math.random().toString(16).slice(2, 10),

    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000
});

mqttClient.on("connect", () => {
    console.log("Connected to HiveMQ broker!");

    mqttConnected = true;

    mqttClient.subscribe(MQTT_TOPIC, (error) => {
        if (error) {
            console.error("Subscription failed:", error.message);
        } else {
            console.log("Subscribed to:", MQTT_TOPIC);
        }
    });
});

// ------------------------------------
// RECEIVE ESP32 DATA
// ------------------------------------

mqttClient.on("message", (topic, message) => {
    try {
        const data = JSON.parse(message.toString());

        const reading = {
            device: data.device || "ESP32",
            adc: Number(data.adc),
            percentage: Number(data.percentage),
            voltage: Number(data.voltage),
            timestamp: new Date().toISOString()
        };

        if (
            !Number.isFinite(reading.adc) ||
            !Number.isFinite(reading.percentage) ||
            !Number.isFinite(reading.voltage) ||
            reading.adc < 0 ||
            reading.adc > 4095 ||
            reading.percentage < 0 ||
            reading.percentage > 100 ||
            reading.voltage < 0 ||
            reading.voltage > 3.3
        ) {
            console.log("Invalid sensor data received");
            return;
        }

        saveReading(reading);

        console.log("New ESP32 reading:", reading);

    } catch (error) {
        console.error("Message processing error:", error.message);
    }
});

// ------------------------------------
// MQTT ERROR HANDLING
// ------------------------------------

mqttClient.on("reconnect", () => {
    console.log("Reconnecting to MQTT...");
});

mqttClient.on("close", () => {
    mqttConnected = false;
    console.log("MQTT connection closed");
});

mqttClient.on("error", (error) => {
    console.error("MQTT error:", error.message);
});

// ------------------------------------
// DATE VALIDATION
// ------------------------------------

function isValidDate(value) {
    return (
        typeof value === "string" &&
        value.trim() !== "" &&
        !Number.isNaN(Date.parse(value))
    );
}

function validateDateRange(req, res) {
    const { startDate, endDate } = req.query;

    if (
        !isValidDate(startDate) ||
        !isValidDate(endDate)
    ) {
        res.status(400).json({
            error: "Valid startDate and endDate are required"
        });

        return null;
    }

    if (Date.parse(startDate) > Date.parse(endDate)) {
        res.status(400).json({
            error: "startDate must be before endDate"
        });

        return null;
    }

    return { startDate, endDate };
}

// ------------------------------------
// API 1: BACKEND HEALTH
// ------------------------------------

app.get("/api/health", (req, res) => {
    res.json({
        server: "running",
        mqttConnected,
        topic: MQTT_TOPIC
    });
});

// ------------------------------------
// API 2: LATEST READING
// ------------------------------------

app.get("/api/latest", (req, res) => {
    try {
        res.json(getLatestReading());
    } catch (error) {
        res.status(500).json({
            error: "Could not retrieve latest reading"
        });
    }
});

// ------------------------------------
// API 3: HISTORICAL READINGS
// ------------------------------------

app.get("/api/history", (req, res) => {
    try {
        res.json(getHistory());
    } catch (error) {
        res.status(500).json({
            error: "Could not retrieve history"
        });
    }
});

// ------------------------------------
// API 4: ALL-TIME ANALYTICS
// ------------------------------------

app.get("/api/analytics", (req, res) => {
    try {
        res.json(getAnalytics());
    } catch (error) {
        res.status(500).json({
            error: "Could not calculate analytics"
        });
    }
});

// ------------------------------------
// API 5: FILTER HISTORY BY DATE
// ------------------------------------

app.get("/api/history/filter", (req, res) => {
    try {
        const dates = validateDateRange(req, res);

        if (!dates) return;

        const history = getHistoryByDate(
            dates.startDate,
            dates.endDate
        );

        res.json(history);

    } catch (error) {
        console.error("History filtering error:", error.message);

        res.status(500).json({
            error: "Could not filter history"
        });
    }
});

// ------------------------------------
// API 6: FILTER ANALYTICS BY DATE
// ------------------------------------

app.get("/api/analytics/filter", (req, res) => {
    try {
        const dates = validateDateRange(req, res);

        if (!dates) return;

        const analytics = getAnalyticsByDate(
            dates.startDate,
            dates.endDate
        );

        res.json(analytics);

    } catch (error) {
        console.error("Analytics filtering error:", error.message);

        res.status(500).json({
            error: "Could not filter analytics"
        });
    }
});

// ------------------------------------
// START SERVER
// ------------------------------------

app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log("ESP32 IoT DASHBOARD BACKEND");
    console.log("--------------------------------");

    console.log(`Server running at http://localhost:${PORT}`);

    console.log("Available API endpoints:");
    console.log("/api/health");
    console.log("/api/latest");
    console.log("/api/history");
    console.log("/api/analytics");
    console.log("/api/history/filter");
    console.log("/api/analytics/filter");

    console.log("--------------------------------");
});
