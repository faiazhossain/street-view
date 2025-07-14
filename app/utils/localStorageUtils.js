/**
 * Utility functions for handling GeoJSON data in local storage
 */

// Keys for local storage
export const STORAGE_KEYS = {
  GEOJSON_DATA: "street_view_geojson_data",
  LAST_FETCHED: "street_view_geojson_last_fetched",
};

/**
 * Save GeoJSON data to local storage
 *
 * @param {Object} data - The GeoJSON data to save
 * @returns {boolean} - Success status
 */
export const saveGeoJsonToLocal = (data) => {
  try {
    // Save the data
    localStorage.setItem(STORAGE_KEYS.GEOJSON_DATA, JSON.stringify(data));

    // Save the timestamp
    localStorage.setItem(STORAGE_KEYS.LAST_FETCHED, Date.now().toString());
    return true;
  } catch (error) {
    console.error("Error saving GeoJSON to local storage:", error);
    return false;
  }
};

/**
 * Load GeoJSON data from local storage
 *
 * @returns {Object|null} - The loaded GeoJSON data or null if not found
 */
export const loadGeoJsonFromLocal = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GEOJSON_DATA);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error loading GeoJSON from local storage:", error);
    return null;
  }
};

/**
 * Get the last fetched timestamp
 *
 * @returns {number|null} - Timestamp in milliseconds or null if not found
 */
export const getLastFetchedTimestamp = () => {
  try {
    const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_FETCHED);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error("Error getting last fetched timestamp:", error);
    return null;
  }
};

/**
 * Check if the local GeoJSON data is stale
 *
 * @param {number} maxAge - Maximum age in milliseconds
 * @returns {boolean} - True if data is stale or doesn't exist
 */
export const isGeoJsonStale = (maxAge = 24 * 60 * 60 * 1000) => {
  const lastFetched = getLastFetchedTimestamp();
  if (!lastFetched) return true;

  return Date.now() - lastFetched > maxAge;
};
