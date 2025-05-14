"use client";

import React from "react";
import { Marker } from "react-map-gl/maplibre";

const SelectedMarker = ({ feature }) => {
  return (
    <Marker
      key={feature.properties.id}
      longitude={feature.geometry.coordinates[0]}
      latitude={feature.geometry.coordinates[1]}
      anchor='bottom'
    >
      <div className='marker selected-marker'>
        <div className='marker-pin' />
      </div>
    </Marker>
  );
};

export default SelectedMarker;
