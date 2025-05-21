// This file will load and process the image data
let imageData = null;
let imagePath = null;

// Function to generate path data from images
function generatePathData(images) {
  // First sort the features by numeric ID extracted from feature ID
  const sortedFeatures = [...images.features].sort((a, b) => {
    // Extract the numeric part from id (img1, img2, etc.)
    const numA = parseInt(a.properties.id.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.properties.id.replace(/\D/g, "")) || 0;
    return numA - numB;
  });

  // Create a LineString from the coordinates of all images in sorted order
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: sortedFeatures.map(
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
