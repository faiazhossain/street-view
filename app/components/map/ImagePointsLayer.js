"use client";

import React from "react";
import { Layer } from "react-map-gl/maplibre";

const ImagePointsLayer = () => {
  return (
    <Layer
      id='image-points'
      type='circle'
      source='images-source'
      paint={{
        "circle-radius": 6,
        "circle-color": "#ff0000",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      }}
    />
  );
};

export default ImagePointsLayer;
