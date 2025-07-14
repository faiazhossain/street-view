// API route to handle GeoJSON feature data
// Direct image URLs from server, no proxy needed

export const dynamic = "force-dynamic";

/**
 * API handler for fetching image features
 * @param {Request} request - The incoming request object
 * @returns {Response} - JSON response with image features
 */
export async function GET(request) {
  try {
    // Get the URL parameters if any
    const url = new URL(request.url);
    const trackParam = url.searchParams.get("track");

    // Fetch merged data from the source API
    const response = await fetch(
      "http://202.72.236.166:8001/api/features/merge-all",
      {
        headers: {
          "Content-Type": "application/json",
        },
        // Add cache: 'no-store' to prevent reusing previous response
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`API response error: ${response.status}`);
    }

    const data = await response.json();

    // If track parameter is specified, filter features by track
    if (trackParam) {
      // Filter features based on track ID pattern
      const filteredFeatures = data.features.filter((feature) => {
        const id = feature.properties.id;
        // Handle different ID formats
        // Format like "track17/17_2" or just "17_2"
        return (
          id.includes(`track${trackParam}/`) || id.startsWith(`${trackParam}_`)
        );
      });

      return Response.json({
        type: "FeatureCollection",
        features: filteredFeatures,
      });
    }

    // Otherwise return all features
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching image features:", error);
    return Response.json(
      { error: "Failed to fetch image features", message: error.message },
      { status: 500 }
    );
  }
}
