import './App.css';
import axios from 'axios';
import React, { useState } from 'react';

function App() {
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState('');

  // ---- ML features state ----
  const [mlData, setMlData] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState('');

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

  const handleChange = (event) => {
    setCity(event.target.value);
  };

  // Calls the Flask ML API (temperature forecast + rain prediction + anomaly check)
  // using the current weather reading we just got from OpenWeatherMap.
  const fetchMLPredictions = async (weather) => {
    setMlLoading(true);
    setMlError('');
    setMlData(null);

    const currentTemp = weather.main.temp - 273.15; // Kelvin -> Celsius
    const month = new Date().getMonth() + 1;
    const { lat, lon } = weather.coord; // OpenWeatherMap already gives us coordinates

    // Backend now fetches REAL recent history for this location from
    // Open-Meteo and computes real lag/rolling features -- we just send lat/lon.
    const locationPayload = { lat, lon };
    const anomalyPayload = { temperature: currentTemp, month };

    try {
      const [tempRes, rainRes, anomalyRes] = await Promise.all([
        axios.post(`${API_BASE}/predict-temperature`, locationPayload),
        axios.post(`${API_BASE}/predict-rain`, locationPayload),
        axios.post(`${API_BASE}/check-anomaly`, anomalyPayload),
      ]);

      setMlData({
        forecastTemp: tempRes.data.forecast_temperature_next_24hr,
        willRain: rainRes.data.will_rain_next_24hr,
        rainProbability: rainRes.data.probability,
        anomaly: anomalyRes.data,
      });
    } catch (err) {
      setMlError('ML predictions unavailable (is the Flask server running?)');
    } finally {
      setMlLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setWeatherData(null);
    setMlData(null);

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.REACT_APP_WEATHER_API_KEY}`
      );

      setWeatherData(response.data);
      fetchMLPredictions(response.data); // kick off ML predictions right after
    } catch (err) {
      if (city === '') {
        setError('Please Enter the City!!!');
      } else {
        setError('City not found');
      }
    }
  };

  return (
    <>
      <body>
        <div class="weather-search-container">
          <h1 className="heading-main">Weather App</h1>
          <form id="weatherForm" onSubmit={handleSubmit}>
            <input type="text" id="cityInput" value={city} onChange={handleChange} placeholder="Enter city name" />
            <button type="submit">Search</button>
          </form>
          <div id="error" class="error"></div>
          <div id="weatherResult" class="weather-result"></div>
          <div className="messages">
            {error && <p className="error">{error}</p>}
            {weatherData && (
              <div className="weather-result">
                <h2>{weatherData.name}</h2>
                <p>Temperature: {(weatherData.main.temp - 273.15).toFixed(1)} °C</p>
                <p>Weather: {weatherData.weather[0].description}</p>
                <p>Country: {weatherData.sys.country}</p>
              </div>
            )}

            {/* ---- ML Insights Section ---- */}
            {weatherData && (
              <div className="ml-insights">
                {mlLoading && <p className="ml-loading">Loading smart predictions...</p>}
                {mlError && <p className="error">{mlError}</p>}

                {mlData && (
                  <>
                    <div className="ml-card ml-temperature">
                      <h3>🌡️ Temperature Forecast</h3>
                      <p>Next 24hr: {mlData.forecastTemp.toFixed(1)} °C</p>
                    </div>

                    <div className="ml-card ml-rain">
                      <h3>🌧️ Rain Prediction</h3>
                      <p>{mlData.willRain ? 'Rain expected' : 'No rain expected'} in next 24hr</p>
                      <p>Confidence: {(mlData.rainProbability * 100).toFixed(0)}%</p>
                    </div>

                    <div className={`ml-card ml-anomaly ${mlData.anomaly.is_anomaly ? 'anomaly-alert' : ''}`}>
                      <h3>📊 Weather Check</h3>
                      <p>{mlData.anomaly.message}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </body>
      <div className="jaison">
       <span>Developed By ~ Shivam Gupta</span>
       {" | "}
        <a target="_blank" href="https://linkedin.com/in/shivam-gupta-05209a27b" rel="noreferrer">
        LinkedIn
        </a>
       {" | "}
        <a target="_blank" href="https://github.com/shivamjigkp" rel="noreferrer">
        GitHub
        </a>
      </div>
      
    </>
  );
}

export default App;
