// API route to handle GeoJSON feature data
// Direct image URLs from server, no proxy needed

export const dynamic = "force-dynamic";
import { promises as fs } from "fs";
import path from "path";

// File path for local cache
const localFilePath = path.join(process.cwd(), "app/data/cached-geojson.json");

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
    const forceRefresh = url.searchParams.has("refresh");

    // Try to use the local cached file first
    let data;
    try {
      const fileContent = await fs.readFile(localFilePath, "utf8");
      data = JSON.parse(fileContent);
    } catch (err) {
      // Local cache file not found or invalid, fetching from API
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

      data = await response.json();
    }

    // If track parameter is specified, filter features by track
    if (trackParam) {
      // Filter features based on track ID pattern
      const filteredFeatures = data.features.filter((feature) => {
        const id = feature.properties?.id;
        if (!id) return false;

        // Handle different ID formats
        // Format like "track17/17_2" or just "17_2" or "99_8" for track99
        const match =
          id.includes(`track${trackParam}/`) ||
          id.startsWith(`${trackParam}_`) ||
          (trackParam === "99" && id.startsWith("99_"));

        return match;
      });

      return Response.json({
        type: "FeatureCollection",
        features: filteredFeatures,
      });
    }

    // Remove metadata if it exists
    if (data._metadata) {
      const cleanData = { ...data };
      delete cleanData._metadata;
      return Response.json(cleanData);
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
