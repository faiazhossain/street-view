// This file will load and process the image data
let imageData = null;
let imagePath = null;

// Function to generate path data from images
function generatePathData(images) {
  // Create a LineString from the coordinates of all images
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: images.features.map(
            (feature) => feature.geometry.coordinates
          ),
        },
      },
    ],
  };
}

// Fetch the image data
async function loadImageData() {
  try {
    const response = await fetch("data/Images_Data.json");
    imageData = await response.json();

    // Generate the path data based on image coordinates
    imagePath = generatePathData(imageData);

    // Initialize the application once data is loaded
    initializeApp();
  } catch (error) {
    console.error("Error loading image data:", error);
  }
}

// Call the load function when the script loads
loadImageData();
