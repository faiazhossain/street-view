// This file handles the map functionality
let map;
let selectedImageId = null;

// Initialize the map
function initializeMap() {
  if (!imageData || !imageData.features || imageData.features.length === 0) {
    console.error("Image data not loaded");
    return;
  }

  // Initialize the map with the first image coordinates
  const firstImage = imageData.features[0];
  const initialCoordinates = firstImage.geometry.coordinates;

  map = new maplibregl.Map({
    container: "map",
    style:
      "https://map.barikoi.com/styles/barikoi-light/style.json?key=NDE2NzpVNzkyTE5UMUoy",
    center: initialCoordinates,
    zoom: 14,
  });

  // Add navigation controls
  map.addControl(new maplibregl.NavigationControl());

  // Wait for map to load before adding layers
  map.on("load", () => {
    // Add image points source
    map.addSource("images-source", {
      type: "geojson",
      data: imageData,
    });

    // Add path source
    map.addSource("path-source", {
      type: "geojson",
      data: imagePath,
    });

    // Add path line layer
    map.addLayer({
      id: "path-line",
      type: "line",
      source: "path-source",
      paint: {
        "line-color": "#0080ff",
        "line-width": 4,
        "line-opacity": 0.8,
      },
    });

    // Add image points layer
    map.addLayer({
      id: "image-points",
      type: "circle",
      source: "images-source",
      paint: {
        "circle-radius": 6,
        "circle-color": "#ff0000",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    // Add click event to image points
    map.on("click", "image-points", (e) => {
      if (e.features.length > 0) {
        const feature = e.features[0];
        if (feature.properties && feature.properties.id) {
          handleImageSelect(feature.properties.id);
        }
      }
    });

    // Change cursor to pointer when hovering over image points
    map.on("mouseenter", "image-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "image-points", () => {
      map.getCanvas().style.cursor = "";
    });
  });
}

// Update the selected marker on the map
function updateSelectedMarker() {
  // Remove any existing selected marker
  const existingMarker = document.getElementById("selected-marker");
  if (existingMarker) {
    existingMarker.remove();
  }

  if (!selectedImageId) return;

  // Find the selected image in the data
  const selectedImage = imageData.features.find(
    (feature) => feature.properties.id === selectedImageId
  );

  if (!selectedImage) return;

  // Create a marker element
  const markerElement = document.createElement("div");
  markerElement.id = "selected-marker";
  markerElement.className = "marker selected-marker";

  // Create the marker pin element
  const pinElement = document.createElement("div");
  pinElement.className = "marker-pin";
  markerElement.appendChild(pinElement);

  // Add the marker to the map
  new maplibregl.Marker(markerElement)
    .setLngLat(selectedImage.geometry.coordinates)
    .addTo(map);
}
