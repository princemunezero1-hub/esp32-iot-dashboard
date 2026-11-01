
import { useState, useEffect } from "react";

import {
  Activity,
  Wifi,
  WifiOff,
  Gauge,
  Zap,
  Database,
  LayoutDashboard,
  Settings,
  Bell,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  CalendarDays,
} from "lucide-react";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import { Line } from "react-chartjs-2";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API = "http://localhost:3000/api";

function App() {
  const [activePage, setActivePage] = useState("Overview");

  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [filteredHistory, setFilteredHistory] = useState([]);

  const [deviceConnected, setDeviceConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  // DATE FILTER STATES
  const [dateFilter, setDateFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterLoading, setFilterLoading] = useState(false);

  // FETCH LATEST ESP32 READING

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const response = await fetch(`${API}/latest`);

        if (!response.ok) {
          throw new Error("Could not get latest reading");
        }

        const data = await response.json();
        setReading(data);

        if (data?.timestamp) {
          const lastUpdate = new Date(data.timestamp).getTime();
          const age = Date.now() - lastUpdate;

          setDeviceConnected(
            Number.isFinite(age) && age >= 0 && age < 10000
          );
        } else {
          setDeviceConnected(false);
        }
      } catch (error) {
        console.error("Latest reading error:", error);
        setDeviceConnected(false);
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();

    const interval = setInterval(fetchLatest, 2000);

    return () => clearInterval(interval);
  }, []);

  // FETCH HISTORICAL READINGS

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API}/history`);

        if (!response.ok) {
          throw new Error("Could not get sensor history");
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setHistory(data);
        }
      } catch (error) {
        console.error("History error:", error);
      }
    };

    fetchHistory();

    const interval = setInterval(fetchHistory, 10000);

    return () => clearInterval(interval);
  }, []);

  // AUTOMATIC ALL-TIME ANALYTICS REFRESH
  // Do not overwrite date-filtered analytics.

  useEffect(() => {
    if (dateFilter !== "all") {
      return;
    }

    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${API}/analytics`);

        if (!response.ok) {
          throw new Error("Could not load analytics");
        }

        const data = await response.json();

        setAnalytics(data);
        setAnalyticsError("");
      } catch (error) {
        console.error("Analytics error:", error);
        setAnalyticsError(
          "Unable to load analytics. Check your backend."
        );
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();

    const interval = setInterval(fetchAnalytics, 10000);

    return () => clearInterval(interval);
  }, [dateFilter]);

  // GET DATE RANGE FOR SELECTED FILTER

  const getDateRange = () => {
    const now = new Date();
    let start;
    let end;

    if (dateFilter === "today") {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);

      end = new Date(now);
    } else if (dateFilter === "24h") {
      end = new Date(now);
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (dateFilter === "7days") {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      end = new Date(now);
    } else if (dateFilter === "custom") {
      if (!startDate || !endDate) {
        throw new Error(
          "Please select both start and end dates."
        );
      }

      start = new Date(`${startDate}T00:00:00`);
      end = new Date(`${endDate}T23:59:59.999`);

      if (start > end) {
        throw new Error(
          "Start date must not be after end date."
        );
      }
    } else {
      return null;
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  // APPLY DATE FILTER

  const applyDateFilter = async () => {
    setFilterLoading(true);
    setAnalyticsError("");

    try {
      // ALL-TIME DATA

      if (dateFilter === "all") {
        const [analyticsResponse, historyResponse] =
          await Promise.all([
            fetch(`${API}/analytics`),
            fetch(`${API}/history`),
          ]);

        if (!analyticsResponse.ok || !historyResponse.ok) {
          throw new Error("Could not load all-time data.");
        }

        const analyticsData = await analyticsResponse.json();
        const historyData = await historyResponse.json();

        setAnalytics(analyticsData);
        setFilteredHistory(historyData);
      } else {
        // GET SELECTED DATE RANGE

        const range = getDateRange();

        const query = new URLSearchParams({
          startDate: range.startDate,
          endDate: range.endDate,
        });

        // Fetch statistics for the selected period
        const analyticsResponse = await fetch(
          `${API}/analytics/filter?${query.toString()}`
        );

        // Fetch saved readings from the history API
        const historyResponse = await fetch(`${API}/history`);

        if (!analyticsResponse.ok || !historyResponse.ok) {
          throw new Error("Could not load filtered data.");
        }

        const analyticsData = await analyticsResponse.json();
        const allHistory = await historyResponse.json();

        // Filter readings using the same date range

        const startTime = new Date(range.startDate).getTime();
        const endTime = new Date(range.endDate).getTime();

        const historyData = allHistory.filter((item) => {
          const readingTime = new Date(item.timestamp).getTime();

          return (
            Number.isFinite(readingTime) &&
            readingTime >= startTime &&
            readingTime <= endTime
          );
        });

        // Sort readings from oldest to newest

        historyData.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() -
            new Date(b.timestamp).getTime()
        );

        setAnalytics(analyticsData);
        setFilteredHistory(historyData);
      }

      setAnalyticsError("");
    } catch (error) {
      console.error("Date filter error:", error);
      setAnalyticsError(
        error.message || "Unable to apply date filter."
      );
    } finally {
      setFilterLoading(false);
      setAnalyticsLoading(false);
    }
  };

  // MANUAL ANALYTICS REFRESH

  const refreshAnalytics = async () => {
    await applyDateFilter();
  };

  // CURRENT READINGS

  const percentage =
    reading?.percentage != null
      ? `${Number(reading.percentage).toFixed(1)}%`
      : "--%";

  const adc =
    reading?.adc != null
      ? Math.round(Number(reading.adc))
      : "----";

  const voltage =
    reading?.voltage != null
      ? `${Number(reading.voltage).toFixed(2)} V`
      : "-- V";

  // OVERVIEW GRAPH

  const chartData = {
    labels: history.map((item) =>
      new Date(item.timestamp).toLocaleTimeString()
    ),

    datasets: [
      {
        label: "Sensor Percentage",
        data: history.map((item) =>
          Number(item.percentage)
        ),
        borderColor: "#3978df",
        backgroundColor: "rgba(57, 120, 223, 0.12)",
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      tooltip: {
        enabled: true,
      },
    },

    scales: {
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "Percentage (%)",
        },
      },

      x: {
        title: {
          display: true,
          text: "Time",
        },
      },
    },
  };

  // ANALYTICS GRAPH

  const displayedHistory =
    dateFilter === "all" ? history : filteredHistory;

  const analyticsChartData = {
    labels: displayedHistory.map((item) =>
      new Date(item.timestamp).toLocaleString()
    ),

    datasets: [
      {
        label: "Sensor Level (%)",
        data: displayedHistory.map((item) =>
          Number(item.percentage)
        ),
        borderColor: "#16a085",
        backgroundColor: "rgba(22, 160, 133, 0.12)",
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 3,
      },
    ],
  };

  const analyticsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      tooltip: {
        enabled: true,
      },
    },

    scales: {
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "Sensor Level (%)",
        },
      },

      x: {
        title: {
          display: true,
          text: "Reading Time",
        },
      },
    },
  };

  // FORMAT ANALYTICS VALUES

  const formatValue = (value, decimals = 2) => {
    if (value === null || value === undefined) {
      return "--";
    }

    return Number(value).toFixed(decimals);
  };

  return (
    <div className="dashboard">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo">
          <Activity size={28} />
          <span>ESP32 <strong>IoT</strong></span>
        </div>

        <p className="menu-label">MAIN MENU</p>

        <nav>

          <button
            className={
              activePage === "Overview"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("Overview")}
          >
            <LayoutDashboard size={19} />
            Overview
          </button>

          <button
            className={
              activePage === "Analytics"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("Analytics")}
          >
            <Database size={19} />
            Analytics
          </button>

          <button
            className={
              activePage === "Settings"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage("Settings")}
          >
            <Settings size={19} />
            Settings
          </button>

        </nav>

        <div className="sidebar-bottom">
          <p>ESP32 Monitoring System</p>
          <span>Version 1.0</span>
        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="main-content">

        <header className="topbar">

          <div>
            <h1>{activePage}</h1>
            <p>Monitor your ESP32 device in real time</p>
          </div>

          <div className="topbar-right">

            <button className="icon-button">
              <Bell size={20} />
            </button>

            <div className="profile">
              <div className="avatar">E</div>

              <div>
                <strong>Administrator</strong>
                <span>System Manager</span>
              </div>
            </div>

          </div>

        </header>

        {/* OVERVIEW PAGE */}

        {activePage === "Overview" && (
          <>

            <section className="device-status">

              <div>

                <div className="status-title">

                  <span
                    className="status-dot"
                    style={{
                      background: deviceConnected
                        ? "#22c55e"
                        : "#f59e0b",
                    }}
                  ></span>

                  ESP32 DEVICE

                </div>

                <h2>ESP32 Potentiometer Sensor</h2>
                <p>Device ID: ESP32-58321</p>

              </div>

              <div className="connection">

                {deviceConnected ? (
                  <>
                    <Wifi size={20} />
                    <span>Device Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={20} />
                    <span>
                      {loading
                        ? "Checking connection..."
                        : "Device Offline"}
                    </span>
                  </>
                )}

              </div>

            </section>

            <section className="stats-grid">

              <div className="stat-card">
                <div className="stat-top">
                  <span>Sensor Percentage</span>
                  <Gauge size={22} />
                </div>
                <h2>{percentage}</h2>
                <p>Live sensor reading</p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>ADC Value</span>
                  <Activity size={22} />
                </div>
                <h2>{adc}</h2>
                <p>Analog input (0–4095)</p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Voltage</span>
                  <Zap size={22} />
                </div>
                <h2>{voltage}</h2>
                <p>Sensor input voltage</p>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Database</span>
                  <Database size={22} />
                </div>
                <h2>SQLite</h2>
                <p>{history.length} saved readings</p>
              </div>

            </section>

            <section className="chart-card">

              <div className="chart-heading">

                <div>
                  <h2>Sensor History</h2>
                  <p>Historical sensor percentage readings</p>
                </div>

                <span className="live-label">
                  LIVE MONITORING
                </span>

              </div>

              <div
                style={{
                  height: "320px",
                  marginTop: "25px",
                  position: "relative",
                }}
              >

                {history.length > 0 ? (
                  <Line
                    data={chartData}
                    options={chartOptions}
                  />
                ) : (
                  <div className="chart-placeholder">
                    <Activity size={42} />
                    <h3>No historical readings yet</h3>
                    <p>
                      Waiting for data from the SQLite database.
                    </p>
                  </div>
                )}

              </div>

              {reading?.timestamp && (
                <p style={{ marginTop: "15px" }}>
                  Last reading:{" "}
                  {new Date(reading.timestamp).toLocaleString()}
                </p>
              )}

            </section>

          </>
        )}

        {/* ANALYTICS PAGE */}

        {activePage === "Analytics" && (

          <div className="analytics-page">

            {/* DATE FILTER PANEL */}

            <section className="chart-card">

              <div className="chart-heading">

                <div>
                  <h2>Date Range Filter</h2>
                  <p>Select the period you want to analyse</p>
                </div>

                <CalendarDays size={25} />

              </div>

              <div className="date-filter-controls">

                <label htmlFor="dateFilter">
                  Select period
                </label>

                <select
                  id="dateFilter"
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(event.target.value)
                  }
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7days">Last 7 days</option>
                  <option value="custom">Custom date range</option>
                </select>

                {dateFilter === "custom" && (
                  <div className="custom-date-controls">

                    <div>
                      <label htmlFor="startDate">
                        Start date
                      </label>

                      <input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(event) =>
                          setStartDate(event.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label htmlFor="endDate">
                        End date
                      </label>

                      <input
                        id="endDate"
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(event) =>
                          setEndDate(event.target.value)
                        }
                      />
                    </div>

                  </div>
                )}

                <button
                  className="apply-filter-button"
                  onClick={applyDateFilter}
                  disabled={filterLoading}
                >
                  <CalendarDays size={18} />
                  {filterLoading
                    ? "Applying..."
                    : "Apply Filter"}
                </button>

              </div>

            </section>

            {/* ANALYTICS HEADER */}

            <section className="chart-card">

              <div className="chart-heading">

                <div>
                  <h2>Sensor Analytics</h2>
                  <p>
                    Statistical analysis of your saved ESP32 readings
                  </p>
                </div>

                <button
                  className="icon-button"
                  onClick={refreshAnalytics}
                  disabled={filterLoading}
                  title="Refresh analytics"
                >
                  <RefreshCw
                    size={20}
                    className={filterLoading ? "spin" : ""}
                  />
                </button>

              </div>

            </section>

            {analyticsError && (
              <section className="chart-card">
                <p style={{ color: "#dc2626" }}>
                  {analyticsError}
                </p>
              </section>
            )}

            {analyticsLoading && !analytics && (
              <section className="chart-card">
                <p>Loading analytics...</p>
              </section>
            )}

            {analytics && (
              <>

                {/* SUMMARY CARDS */}

                <section className="stats-grid">

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Total Readings</span>
                      <Database size={22} />
                    </div>
                    <h2>{analytics.totalReadings}</h2>
                    <p>Records in selected period</p>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Average Level</span>
                      <Gauge size={22} />
                    </div>
                    <h2>
                      {formatValue(analytics.averagePercentage)}%
                    </h2>
                    <p>Average sensor percentage</p>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Maximum Level</span>
                      <TrendingUp size={22} />
                    </div>
                    <h2>
                      {formatValue(analytics.maximumPercentage)}%
                    </h2>
                    <p>Highest recorded percentage</p>
                  </div>

                  <div className="stat-card">
                    <div className="stat-top">
                      <span>Minimum Level</span>
                      <TrendingDown size={22} />
                    </div>
                    <h2>
                      {formatValue(analytics.minimumPercentage)}%
                    </h2>
                    <p>Lowest recorded percentage</p>
                  </div>

                </section>

                {/* VOLTAGE AND ADC ANALYSIS */}

                <section className="chart-card">

                  <div className="chart-heading">

                    <div>
                      <h2>Electrical Measurements</h2>
                      <p>
                        Voltage and analog-to-digital converter statistics
                      </p>
                    </div>

                    <Zap size={24} />

                  </div>

                  <div className="stats-grid">

                    <div className="stat-card">
                      <div className="stat-top">
                        <span>Average Voltage</span>
                        <Zap size={22} />
                      </div>
                      <h2>
                        {formatValue(analytics.averageVoltage)} V
                      </h2>
                      <p>Mean voltage</p>
                    </div>

                    <div className="stat-card">
                      <div className="stat-top">
                        <span>Maximum Voltage</span>
                        <TrendingUp size={22} />
                      </div>
                      <h2>
                        {formatValue(analytics.maximumVoltage)} V
                      </h2>
                      <p>Highest voltage</p>
                    </div>

                    <div className="stat-card">
                      <div className="stat-top">
                        <span>Average ADC</span>
                        <Activity size={22} />
                      </div>
                      <h2>
                        {formatValue(analytics.averageAdc, 0)}
                      </h2>
                      <p>Mean ADC value</p>
                    </div>

                    <div className="stat-card">
                      <div className="stat-top">
                        <span>Maximum ADC</span>
                        <BarChart3 size={22} />
                      </div>
                      <h2>
                        {formatValue(analytics.maximumAdc, 0)}
                      </h2>
                      <p>Highest ADC value</p>
                    </div>

                  </div>

                  <div className="analytics-details">

                    <p>
                      Minimum voltage:{" "}
                      <strong>
                        {formatValue(analytics.minimumVoltage)} V
                      </strong>
                    </p>

                    <p>
                      Minimum ADC:{" "}
                      <strong>
                        {formatValue(analytics.minimumAdc, 0)}
                      </strong>
                    </p>

                  </div>

                </section>

                {/* FILTERED HISTORY GRAPH */}

                <section className="chart-card">

                  <div className="chart-heading">

                    <div>
                      <h2>Historical Analysis</h2>
                      <p>
                        Sensor percentage changes over selected period
                      </p>
                    </div>

                    <BarChart3 size={24} />

                  </div>

                  <div
                    style={{
                      height: "350px",
                      marginTop: "25px",
                      position: "relative",
                    }}
                  >

                    {displayedHistory.length > 0 ? (
                      <Line
                        data={analyticsChartData}
                        options={analyticsChartOptions}
                      />
                    ) : (
                      <div className="chart-placeholder">
                        <Activity size={42} />
                        <h3>No readings in this period</h3>
                        <p>
                          Try selecting another date range.
                        </p>
                      </div>
                    )}

                  </div>

                  <p style={{ marginTop: "15px" }}>
                    Graph contains {displayedHistory.length} readings.
                  </p>

                </section>

              </>
            )}

          </div>

        )}

        {/* SETTINGS PAGE */}

        {activePage === "Settings" && (
          <section className="chart-card">
            <h2>Settings</h2>
            <p>
              Device and dashboard settings will appear here.
            </p>
          </section>
        )}

      </main>

    </div>
  );
}

export default App;
