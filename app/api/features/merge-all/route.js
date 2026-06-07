export const dynamic = "force-dynamic";
import { promises as fs } from "fs";
import path from "path";

// File path for local cache
const localFilePath = path.join(process.cwd(), "app/data/cached-geojson.json");

// A shorter timeout for development, can be longer in production
const API_TIMEOUT = 8000; // 8 seconds

// How long to consider cached data valid (24 hours by default)
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * API handler for fetching all merged GeoJSON features
 * This acts as a direct proxy to the source API endpoint
 * @param {Request} request - The incoming request object
 * @returns {Response} - JSON response with merged GeoJSON features
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.has("refresh");
    const useLocal = url.searchParams.has("local");

    // Check if we have local cache and if it's still valid
    let localFileExists = false;
    let localData = null;
    let cacheIsStale = true;

    try {
      const fileContent = await fs.readFile(localFilePath, "utf8");
      localData = JSON.parse(fileContent);
      localFileExists = true;

      // Check if cache is stale
      if (localData._metadata && localData._metadata.timestamp) {
        const cacheAge = Date.now() - localData._metadata.timestamp;
        cacheIsStale = cacheAge > CACHE_TTL;
      }

      // If we're not forcing a refresh and (cache is not stale OR explicit useLocal flag)
      if (!forceRefresh && (useLocal || !cacheIsStale)) {
        // Return the cached data, but remove metadata
        const returnData = { ...localData };
        if (returnData._metadata) delete returnData._metadata;

        return Response.json(returnData);
      }
    } catch (err) {
      localFileExists = false;
    }

    // Create an AbortController with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, API_TIMEOUT);

    try {
      // Choose API endpoint based on environment
      let apiEndpoint = "https://streetview.bmapsbd.com/api/api/features/";

      // If we're in development, try local backend first
      if (process.env.NODE_ENV === "development") {
        try {
          const backendUrl = process.env.BACKEND_API_URL || "http://0.0.0.0:8001";
          const localResponse = await fetch(
            `${backendUrl}/api/features`,
            {
              headers: {
                "Content-Type": "application/json",
              },
              signal: controller.signal,
              cache: "no-store",
            }
          );

          if (localResponse.ok) {
            clearTimeout(timeoutId);
            const data = await localResponse.json();

            // Save to local file with metadata
            const saveData = {
              ...data,
              _metadata: {
                timestamp: Date.now(),
                source: "0.0.0.0:8001 API",
              },
            };

            // Save to local file
            await fs.writeFile(
              localFilePath,
              JSON.stringify(saveData, null, 2)
            );

            return Response.json(data);
          }
        } catch (localError) {
          // Fallback to remote API
        }
      }

      // Fetch merged data from the source API with timeout protection
      const response = await fetch(apiEndpoint, {
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API response error: ${response.status}`);
      }

      const data = await response.json();

      // Save to local file with metadata
      const saveData = {
        ...data,
        _metadata: {
          timestamp: Date.now(),
          source: apiEndpoint,
        },
      };

      // Save to local file
      await fs.writeFile(localFilePath, JSON.stringify(saveData, null, 2));

      // Return the raw GeoJSON data
      return Response.json(data);
    } catch (fetchError) {
      // Clear the timeout if it hasn't triggered yet
      clearTimeout(timeoutId);

      // If we have a local file, use it as fallback
      if (localFileExists && localData) {
        // Return the cached data, but remove metadata
        const returnData = { ...localData };
        if (returnData._metadata) delete returnData._metadata;

        return Response.json(returnData);
      }

      // If it's an AbortError (timeout), send a clearer message
      if (fetchError.name === "AbortError") {
        return Response.json(
          {
            error: "Request timed out",
            message:
              "The API request took too long to respond. Please try again later or use cached data.",
          },
          { status: 504 }
        );
      }

      // For other errors
      throw fetchError;
    }
  } catch (error) {
    console.error("Error in API route:", error);

    return Response.json(
      {
        error: "Failed to fetch GeoJSON data",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
