"use client";

import React from "react";
import { Marker } from "react-map-gl/maplibre";

const SelectedMarker = ({ feature }) => {
  // Get coordinates from feature
  const markerLongitude = feature.geometry.coordinates[0];
  const markerLatitude = feature.geometry.coordinates[1];

  // Only render if we have valid coordinates
  if (!markerLongitude || !markerLatitude) return null;

  return (
    <Marker
      key={feature.properties.id}
      longitude={markerLongitude}
      latitude={markerLatitude}
      anchor='bottom'
      pitchAlignment='map'
    >
      <div className='marker selected-marker scale-in'>
        <div className='marker-pin' />
      </div>
    </Marker>
  );
};

export default SelectedMarker;
