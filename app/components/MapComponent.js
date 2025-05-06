'use client';

import { useState, useRef, useCallback } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapComponent = ({
  imageData,
  pathData,
  selectedImageId,
  onImageSelect,
  mapStyle = 'https://map.barikoi.com/styles/barikoi-light/style.json?key=NDE2NzpVNzkyTE5UMUoy',
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
      style={{ width: '100%', height: '500px' }}
      mapStyle={mapStyle}
      onMove={(evt) => setViewState(evt.viewState)}
      interactiveLayerIds={['image-points']}
      onClick={onMapClick}
    >
      {/* Path LineString Layer */}
      <Source id='path-source' type='geojson' data={pathData}>
        <Layer
          id='path-line'
          type='line'
          paint={{
            'line-color': '#0080ff',
            'line-width': 4,
            'line-opacity': 0.8,
          }}
        />
      </Source>

      {/* Image Points Layer */}
      <Source id='images-source' type='geojson' data={imageData}>
        <Layer
          id='image-points'
          type='circle'
          paint={{
            'circle-radius': 6,
            'circle-color': '#ff0000',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          }}
        />
      </Source>

      {/* Selected Image Marker */}
      {selectedImageId &&
        imageData.features
          .filter((feature) => feature.properties.id === selectedImageId)
          .map((feature) => (
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
          ))}
    </Map>
  );
};

export default MapComponent;
