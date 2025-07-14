/**
 * Utility functions for handling GeoJSON data in local storage and IndexedDB
 */

// Keys for storage
export const STORAGE_KEYS = {
  GEOJSON_DATA: "street_view_geojson_data",
  LAST_FETCHED: "street_view_geojson_last_fetched",
};

// IndexedDB configuration
const DB_NAME = "StreetViewDB";
const DB_VERSION = 1;
const STORE_NAME = "geojsonData";

/**
 * Initialize the IndexedDB database
 *
 * @returns {Promise} - Promise that resolves with the database instance
 */
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // Open or create the database
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Create object store if needed (first time)
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
        console.log("Created IndexedDB store for GeoJSON data");
      }
    };

    // Handle errors
    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    // Success handler
    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };
  });
};

/**
 * Save GeoJSON data to IndexedDB
 * Falls back to localStorage if IndexedDB fails
 *
 * @param {Object} data - The GeoJSON data to save
 * @returns {Promise<boolean>} - Promise that resolves with success status
 */
export const saveGeoJsonToLocal = async (data) => {
  try {
    // Save the timestamp to localStorage
    localStorage.setItem(STORAGE_KEYS.LAST_FETCHED, Date.now().toString());

    // Try to save to IndexedDB first
    try {
      const db = await initDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        // Use a consistent ID for the data
        const record = {
          id: "main_geojson",
          data: data,
          timestamp: Date.now(),
        };

        const request = store.put(record);

        request.onsuccess = () => {
          console.log("GeoJSON data saved to IndexedDB");
          resolve(true);
        };

        request.onerror = (event) => {
          console.error("Error saving to IndexedDB:", event.target.error);
          reject(event.target.error);
        };

        // Close the database when transaction completes
        transaction.oncomplete = () => db.close();
      });
    } catch (indexedDBError) {
      // Fallback to localStorage if IndexedDB fails
      console.warn(
        "IndexedDB failed, falling back to localStorage:",
        indexedDBError
      );

      try {
        localStorage.setItem(STORAGE_KEYS.GEOJSON_DATA, JSON.stringify(data));
        return true;
      } catch (localStorageError) {
        console.error("Error saving to localStorage:", localStorageError);
        throw localStorageError;
      }
    }
  } catch (error) {
    console.error("Error saving GeoJSON data:", error);
    return false;
  }
};

/**
 * Load GeoJSON data from IndexedDB
 * Falls back to localStorage if IndexedDB fails
 *
 * @returns {Promise<Object|null>} - Promise that resolves with the GeoJSON data or null
 */
export const loadGeoJsonFromLocal = async () => {
  try {
    // Try to load from IndexedDB first
    try {
      const db = await initDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);

        const request = store.get("main_geojson");

        request.onsuccess = (event) => {
          const record = event.target.result;
          if (record) {
            console.log("GeoJSON data loaded from IndexedDB");
            resolve(record.data);
          } else {
            console.log("No GeoJSON data found in IndexedDB");
            resolve(null);
          }
        };

        request.onerror = (event) => {
          console.error("Error loading from IndexedDB:", event.target.error);
          reject(event.target.error);
        };

        // Close the database when transaction completes
        transaction.oncomplete = () => db.close();
      });
    } catch (indexedDBError) {
      // Fallback to localStorage if IndexedDB fails
      console.warn(
        "IndexedDB failed, falling back to localStorage:",
        indexedDBError
      );

      try {
        const data = localStorage.getItem(STORAGE_KEYS.GEOJSON_DATA);
        return data ? JSON.parse(data) : null;
      } catch (localStorageError) {
        console.error("Error loading from localStorage:", localStorageError);
        return null;
      }
    }
  } catch (error) {
    console.error("Error loading GeoJSON data:", error);
    return null;
  }
};

/**
 * Get the last fetched timestamp from localStorage
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

/**
 * Clear all GeoJSON data from storage
 *
 * @returns {Promise<boolean>} - Promise that resolves with success status
 */
export const clearGeoJsonData = async () => {
  try {
    // Clear from IndexedDB
    try {
      const db = await initDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        const request = store.delete("main_geojson");

        request.onsuccess = () => {
          console.log("GeoJSON data cleared from IndexedDB");

          // Also clear from localStorage
          localStorage.removeItem(STORAGE_KEYS.GEOJSON_DATA);
          localStorage.removeItem(STORAGE_KEYS.LAST_FETCHED);

          resolve(true);
        };

        request.onerror = (event) => {
          console.error("Error clearing IndexedDB:", event.target.error);
          reject(event.target.error);
        };

        // Close the database when transaction completes
        transaction.oncomplete = () => db.close();
      });
    } catch (indexedDBError) {
      // Fallback to clearing just localStorage
      console.warn(
        "IndexedDB failed, clearing localStorage only:",
        indexedDBError
      );
      localStorage.removeItem(STORAGE_KEYS.GEOJSON_DATA);
      localStorage.removeItem(STORAGE_KEYS.LAST_FETCHED);
      return true;
    }
  } catch (error) {
    console.error("Error clearing GeoJSON data:", error);
    return false;
  }
};
