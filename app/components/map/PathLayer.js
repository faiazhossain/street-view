"use client";

import React from "react";
import { Layer } from "react-map-gl/maplibre";

const PathLayer = ({ pathData }) => {
  return (
    <>
      <Layer
        id='path-line'
        type='line'
        source='path-source'
        paint={{
          "line-color": "#0080ff",
          "line-width": 4,
          "line-opacity": 0.8,
        }}
      />
    </>
  );
};

export default PathLayer;
