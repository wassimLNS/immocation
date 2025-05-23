import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import './App.css';

const containerStyle = {
  width: '100%',
  height: '500px'
};

function App() {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 0,
    lng: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSelectedLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoading(false);
        },
        (error) => {
          setError('Error getting your location: ' + error.message);
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
    }
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setSelectedLocation({
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      });
    }
  };

  if (loading) {
    return <div>Loading map...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Property Location Finder</h1>
      </header>
      
      <main className="App-main">
        <div className="map-container">
          <LoadScript googleMapsApiKey="AIzaSyDQgyaG097gD3lXAI-G-RNv6keTRfSB-e4">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={selectedLocation}
              zoom={13} // Adjust zoom level as needed
              onClick={handleMapClick}
            >
              {/* Marker at the selected location */}
              <Marker position={selectedLocation} />
            </GoogleMap>
          </LoadScript>
        </div>
        
        <div className="location-info">
          <h2>Selected Location</h2>
          <p>Latitude: {selectedLocation.lat.toFixed(6)}</p>
          <p>Longitude: {selectedLocation.lng.toFixed(6)}</p>
        </div>
      </main>
    </div>
  );
}

export default App;
