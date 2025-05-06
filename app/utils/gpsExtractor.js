'use server';

import fs from 'fs';
import path from 'path';
import ExifParser from 'exif-parser';

/**
 * Handles GPS coordinates that might be in different formats
 * @param {number|Array} coordinates - Either decimal degrees or DMS array
 * @param {string} direction - N, S, E, W direction
 * @returns {number} - Decimal coordinates
 */
function processCoordinates(coordinates, direction) {
  let decimal;

  // Check if coordinates is already a decimal number
  if (typeof coordinates === 'number') {
    decimal = coordinates;
  }
  // Check if it's an array (traditional DMS format)
  else if (Array.isArray(coordinates) && coordinates.length >= 3) {
    decimal = coordinates[0] + coordinates[1] / 60 + coordinates[2] / 3600;
  } else {
    console.log('Unsupported coordinates format:', coordinates);
    return null;
  }

  // If the direction is South or West, we need to negate the coordinate
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Extracts GPS coordinates from an image file
 * @param {string} imagePath - Path to the image file
 * @returns {Object|null} - Object with lat and lng properties, or null if no GPS data found
 */
export async function extractGpsFromImage(imagePath) {
  try {
    console.log(`Reading file: ${imagePath}`);
    const buffer = fs.readFileSync(imagePath);
    console.log(`File size: ${buffer.length} bytes`);

    const parser = ExifParser.create(buffer);
    const result = parser.parse();

    console.log('EXIF tags found:', Object.keys(result.tags));
    console.log(
      'GPS data in tags:',
      JSON.stringify({
        GPSLatitude: result.tags.GPSLatitude,
        GPSLatitudeRef: result.tags.GPSLatitudeRef,
        GPSLongitude: result.tags.GPSLongitude,
        GPSLongitudeRef: result.tags.GPSLongitudeRef,
      })
    );

    if (!result.tags || !result.tags.GPSLatitude) {
      console.warn(`No GPS data found in image: ${imagePath}`);
      return null;
    }

    const lat = processCoordinates(
      result.tags.GPSLatitude,
      result.tags.GPSLatitudeRef
    );

    const lng = processCoordinates(
      result.tags.GPSLongitude,
      result.tags.GPSLongitudeRef
    );

    console.log(`Extracted coordinates: lat=${lat}, lng=${lng}`);

    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      console.warn(`Invalid GPS data in image: ${imagePath}`);
      return null;
    }

    return { lat, lng };
  } catch (error) {
    console.error(`Error extracting GPS data from ${imagePath}:`, error);
    return null;
  }
}

/**
 * Extracts GPS data from all images in a directory
 * @param {string} directoryPath - Path to the directory containing images
 * @returns {Object} - Map of image filenames to their GPS coordinates
 */
export async function extractGpsFromDirectory(directoryPath) {
  try {
    const files = fs.readdirSync(directoryPath);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.tiff', '.tif'].includes(ext);
    });

    const gpsData = {};

    for (const file of imageFiles) {
      const filePath = path.join(directoryPath, file);
      const gps = await extractGpsFromImage(filePath);

      if (gps) {
        gpsData[file] = gps;
      }
    }

    return gpsData;
  } catch (error) {
    console.error(`Error reading directory ${directoryPath}:`, error);
    return {};
  }
}

/**
 * Generates a GeoJSON feature collection from GPS data
 * @param {Object} gpsData - Map of image filenames to their GPS coordinates
 * @param {string} baseUrl - Base URL for accessing the images
 * @returns {Object} - GeoJSON feature collection
 */
export async function generateGeoJson(gpsData, baseUrl = '/street-view/') {
  const features = Object.entries(gpsData).map(([filename, coords], index) => {
    const id = path.basename(filename, path.extname(filename));

    return {
      type: 'Feature',
      properties: {
        id,
        imageUrl: `${baseUrl}${filename}`,
        initialYaw: 0,
        initialPitch: 0,
        initialHfov: 100,
        showCompass: true,
      },
      geometry: {
        type: 'Point',
        coordinates: [coords.lng, coords.lat], // GeoJSON uses [longitude, latitude] order
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
