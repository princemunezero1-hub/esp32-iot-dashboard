# ESP32 IoT Monitoring Dashboard

A real-time IoT monitoring system that collects sensor readings from an ESP32, transmits data using MQTT, stores historical readings in an SQLite database, and visualizes the information through a web-based dashboard.

## 1. Project Overview

The ESP32 IoT Monitoring Dashboard is designed to demonstrate how Internet of Things (IoT) technology can be used to monitor sensor data remotely.

The project currently uses an ESP32 and a potentiometer in the Wokwi simulator. The potentiometer simulates changing sensor values, allowing the system to be tested without a physical sensor.

The collected readings are transmitted through an MQTT broker to a Node.js backend, stored in an SQLite database, and displayed on a React dashboard.

## 2. System Architecture

The system follows this data communication process:

1. **ESP32:** Reads the simulated sensor value from the potentiometer.
2. **MQTT Broker:** Receives and distributes sensor messages using the MQTT protocol.
3. **Node.js Backend:** Receives MQTT messages and processes incoming readings.
4. **SQLite Database:** Stores sensor readings for historical monitoring.
5. **React Dashboard:** Displays sensor readings, charts and historical information.

### System Data Flow

Wokwi ESP32 + Potentiometer  
↓  
MQTT Broker (HiveMQ)  
↓  
Node.js + Express Backend  
↓  
SQLite Database  
↓  
React Web Dashboard

## 3. Technologies Used

| Technology | Purpose |
|---|---|
| ESP32 | Reads simulated sensor data |
| Wokwi | Simulates the ESP32 hardware |
| Potentiometer | Simulates changing sensor readings |
| MQTT | Transfers sensor data |
| HiveMQ | Provides the MQTT broker |
| Node.js | Backend runtime environment |
| Express.js | Backend web server |
| SQLite | Stores historical readings |
| React.js | Builds the user interface |
| Chart.js | Visualizes sensor data |
| Git and GitHub | Version control and project hosting |

## 4. Main Features

- Real-time sensor data monitoring.
- Wireless data communication using MQTT.
- Historical sensor data storage.
- Interactive data visualization using charts.
- Date-based filtering of historical readings.
- Web-based monitoring interface.
- Separation of frontend and backend components.

## 5. Project Structure

The main project structure is organized as follows:

```text
ESP32-IOT-DASHBOARD/
│
├── client/              # React frontend
│   ├── public/
│   └── src/
│
├── src/                 # Node.js backend
│   ├── database.js
│   └── server.js
│
├── data/                # Local database storage
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

Note: The local database folder and environment configuration are excluded from GitHub.

## 6. Project Simulation

The hardware simulation is developed using Wokwi.

The ESP32 reads changing values from a potentiometer and publishes the readings to an MQTT topic. The backend receives these readings and makes them available to the dashboard.

## 7. Future Improvements

- Replace the simulated potentiometer with a physical sensor.
- Deploy the backend and frontend for remote access.
- Introduce secure communication and authentication.
- Improve system reliability and error handling.
- Integrate additional sensors for wider monitoring applications.

## 8. Project Objectives

The main objectives are:

- Understand ESP32-based IoT systems.
- Learn MQTT communication between devices and servers.
- Develop backend applications for processing sensor data.
- Store and retrieve historical sensor information.
- Design professional web dashboards for monitoring IoT systems.

## 9. Author

**GitHub:** [princemunezero1-hub](https://github.com/princemunezero1-hub)

## 10. Repository

[ESP32 IoT Monitoring Dashboard](https://github.com/princemunezero1-hub/esp32-iot-dashboard)

---

*This project is an ongoing engineering learning and development project.*