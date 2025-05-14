"use client";

import { useState, useCallback } from "react";
import Map, { Source } from "react-map-gl/maplibre";
import PathLayer from "./map/PathLayer";
import ImagePointsLayer from "./map/ImagePointsLayer";
import SelectedMarker from "./map/SelectedMarker";
import "maplibre-gl/dist/maplibre-gl.css";

const MapComponent = ({
  imageData,
  pathData,
  selectedImageId,
  onImageSelect,
  mapStyle = "https://map.barikoi.com/styles/barikoi-light/style.json?key=NDE2NzpVNzkyTE5UMUoy",
}) => {
  const [viewState, setViewState] = useState({
    longitude: imageData.features[0].geometry.coordinates[0],
    latitude: imageData.features[0].geometry.coordinates[1],
    zoom: 14,
  });

  const onMapClick = useCallback(
    (event) => {
      // Handle when the user clicks on the map but not on a marker
      const features = event.features || [];

      if (features.length > 0) {
        const feature = features[0];
        if (feature.properties && feature.properties.id) {
          onImageSelect(feature.properties.id);
        }
      }
    },
    [onImageSelect]
  );

  return (
    <Map
      {...viewState}
      style={{ width: "100%", height: "500px" }}
      mapStyle={mapStyle}
      onMove={(evt) => setViewState(evt.viewState)}
      interactiveLayerIds={["image-points"]}
      onClick={onMapClick}
    >
      {/* Path LineString Layer */}
      <Source id='path-source' type='geojson' data={pathData}>
        <PathLayer />
      </Source>

      {/* Image Points Layer */}
      <Source id='images-source' type='geojson' data={imageData}>
        <ImagePointsLayer />
      </Source>

      {/* Selected Image Marker */}
      {selectedImageId &&
        imageData.features
          .filter((feature) => feature.properties.id === selectedImageId)
          .map((feature) => (
            <SelectedMarker key={feature.properties.id} feature={feature} />
          ))}
    </Map>
  );
};

export default MapComponent;
