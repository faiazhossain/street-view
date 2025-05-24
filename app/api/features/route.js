// Next.js API route to proxy requests to the local API server
// and avoid CORS issues

// Helper function to ensure image URLs are properly formatted
const formatImageUrl = (url) => {
  if (!url) return "";

  // If URL already contains /api/proxy/, leave it as is
  if (url.includes("/api/proxy/")) {
    return url;
  }

  // Replace the server URL with our proxy
  if (url.includes("192.168.68.112:8000")) {
    return url.replace("http://192.168.68.112:8000/", "/api/proxy/");
  }

  // If it's a relative path, make sure it uses the proxy
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `/api/proxy/${url.startsWith("/") ? url.substring(1) : url}`;
  }

  return url;
};

export async function GET() {
  try {
    // Make the request to your local API server
    const response = await fetch("http://192.168.68.112:8000/api/features", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get the response data
    const rawData = await response.json();

    // Debug: Log the API response structure
    console.log(
      "API Response Structure:",
      JSON.stringify(rawData).substring(0, 500) + "..."
    );

    // Validate data format
    if (!rawData || typeof rawData !== "object") {
      throw new Error("API returned invalid data format: not an object");
    }

    // Check if data property exists as expected
    if (!rawData.data || !Array.isArray(rawData.data)) {
      // If rawData is already an array, use it directly
      const dataArray = Array.isArray(rawData) ? rawData : [rawData];

      // Format data for the map component
      const formattedData = {
        type: "FeatureCollection",
        features: dataArray.map((item) => ({
          type: "Feature",
          properties: {
            // Ensure we have properties, or create empty object
            ...(item.properties || {}),
            id:
              item.feature_id ||
              item.id ||
              `feature-${Math.random().toString(36).substring(2, 9)}`,
            imageUrl: formatImageUrl(
              item.image_url_high || item.imageUrl_High || item.image_url || ""
            ),
            imageUrl_High: formatImageUrl(
              item.image_url_high || item.imageUrl_High || ""
            ),
            imageUrl_Comp: formatImageUrl(
              item.image_url_comp || item.imageUrl_Comp || ""
            ),
          },
          geometry: {
            type: "Point",
            coordinates: [
              parseFloat(item.longitude || 0),
              parseFloat(item.latitude || 0),
            ],
          },
        })),
      };

      // Return the formatted response
      return new Response(JSON.stringify(formattedData), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Format data for the map component (original format with rawData.data)
    const formattedData = {
      type: "FeatureCollection",
      features: rawData.data.map((item) => ({
        type: "Feature",
        properties: {
          ...(item.properties || {}),
          id:
            item.feature_id ||
            item.id ||
            `feature-${Math.random().toString(36).substring(2, 9)}`,
          imageUrl: formatImageUrl(
            item.image_url_high || item.imageUrl_High || item.image_url || ""
          ),
          imageUrl_High: formatImageUrl(
            item.image_url_high || item.imageUrl_High || ""
          ),
          imageUrl_Comp: formatImageUrl(
            item.image_url_comp || item.imageUrl_Comp || ""
          ),
        },
        geometry: {
          type: "Point",
          coordinates: [
            parseFloat(item.longitude || 0),
            parseFloat(item.latitude || 0),
          ],
        },
      })),
    };

    // Return the formatted response
    return new Response(JSON.stringify(formattedData), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("API Error:", error);

    // Return more detailed error response
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
