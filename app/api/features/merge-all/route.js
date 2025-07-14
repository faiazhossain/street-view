export const dynamic = "force-dynamic";
import { promises as fs } from "fs";
import path from "path";

// File path for local cache
const localFilePath = path.join(process.cwd(), "app/data/cached-geojson.json");

// A shorter timeout for development, can be longer in production
const API_TIMEOUT = 8000; // 8 seconds

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
    const useLocal = url.searchParams.has("local") || !forceRefresh;

    // Always check for local file first
    let localFileExists = false;
    let localData = null;

    try {
      const fileContent = await fs.readFile(localFilePath, "utf8");
      localData = JSON.parse(fileContent);
      localFileExists = true;

      // If we're not forcing a refresh and the local file exists, use it
      if (useLocal && !forceRefresh) {
        console.log("Using cached local file GeoJSON data");

        // Return the cached data, but remove metadata
        const returnData = { ...localData };
        if (returnData._metadata) delete returnData._metadata;

        return Response.json(returnData);
      }
    } catch (err) {
      console.log("No local cache file found or it's invalid");
      localFileExists = false;
    }

    // Create an AbortController with a shorter timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("API request timeout reached, aborting");
      controller.abort();
    }, API_TIMEOUT);

    try {
      // Choose API endpoint based on environment
      let apiEndpoint = "http://202.72.236.166:8001/api/features/merge-all";

      // If we're in development, try localhost first
      if (process.env.NODE_ENV === "development") {
        try {
          const localResponse = await fetch(
            "http://localhost:8001/api/features/merge-all",
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
                source: "localhost API",
              },
            };

            // Save to local file
            await fs.writeFile(
              localFilePath,
              JSON.stringify(saveData, null, 2)
            );
            console.log("Saved local GeoJSON data from localhost API");

            return Response.json(data);
          }
        } catch (localError) {
          console.log("Local API not available, falling back to remote API");
        }
      }

      // Fetch merged data from the source API with timeout protection
      console.log("Fetching from remote API:", apiEndpoint);
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
      console.log("Successfully saved GeoJSON data to local cache file");

      // Return the raw GeoJSON data
      return Response.json(data);
    } catch (fetchError) {
      // Clear the timeout if it hasn't triggered yet
      clearTimeout(timeoutId);

      console.error(
        "Error fetching from API:",
        fetchError.name,
        fetchError.message
      );

      // If we have a local file, use it as fallback
      if (localFileExists && localData) {
        console.log("API request failed. Using local file as fallback.");

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
    console.error("Fatal error in API route:", error);

    return Response.json(
      {
        error: "Failed to fetch GeoJSON data",
        message: error.message,
        solution:
          "Check the server logs and ensure the API endpoint is available.",
      },
      { status: 500 }
    );
  }
}
