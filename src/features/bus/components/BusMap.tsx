import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export interface BusMapStop {
  name: string;
  lat: number;
  lng: number;
}

interface BusMapProps {
  stops: BusMapStop[];
  busLocation?: { lat: number; lng: number } | null;
}

export const BusMap: React.FC<BusMapProps> = ({ stops, busLocation }) => {
  const webRef = useRef<WebView>(null);

  // Inject bus live position updates into the Leaflet script dynamically
  useEffect(() => {
    if (webRef.current && busLocation) {
      const script = `
        (function() {
          if (window.updateBusMarker) {
            window.updateBusMarker(${busLocation.lat}, ${busLocation.lng});
          }
        })();
        true;
      `;
      webRef.current.injectJavaScript(script);
    }
  }, [busLocation]);

  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"><\/script>
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
    }
    .custom-stop-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #4a154b;
      border: 2px solid #ffffff;
      color: #ffffff;
      font-weight: bold;
      font-size: 11px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .custom-bus-marker {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4), 0 2px 8px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([21.1458, 79.0882], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: ''
    }).addTo(map);

    var stopsData = ${JSON.stringify(stops)};
    var stopMarkers = [];
    var routePoints = [];

    // Plot stops
    stopsData.forEach(function(stop, index) {
      var lat = parseFloat(stop.lat);
      var lng = parseFloat(stop.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        routePoints.push([lat, lng]);
        var icon = L.divIcon({
          html: '<div class="custom-stop-marker">' + (index + 1) + '<\/div>',
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        var marker = L.marker([lat, lng], { icon: icon })
          .bindPopup('<b>' + stop.name + '<\/b>')
          .addTo(map);
        stopMarkers.push(marker);
      }
    });

    // Plot route polyline
    if (routePoints.length > 1) {
      var routeLine = L.polyline(routePoints, { color: '#4a154b', weight: 4 }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    }

    // Live bus marker
    var busMarker = null;
    window.updateBusMarker = function(lat, lng) {
      if (!lat || !lng) return;
      var pos = [parseFloat(lat), parseFloat(lng)];
      
      if (!busMarker) {
        var busIcon = L.divIcon({
          html: '<div class="custom-bus-marker"><\/div>',
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        busMarker = L.marker(pos, { icon: busIcon }).addTo(map);
      } else {
        busMarker.setLatLng(pos);
      }
      map.panTo(pos);
    };

    // Initial positioning check
    if (stopsData.length === 0) {
      map.setView([21.1458, 79.0882], 13);
    }
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html: leafletHtml }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  webview: {
    flex: 1,
  },
});
