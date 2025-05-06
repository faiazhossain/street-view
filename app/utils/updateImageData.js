'use server';

import { extractGpsFromDirectory, generateGeoJson } from './gpsExtractor.js';
import fs from 'fs';
import path from 'path';

/**
 * Updates the imageData.js file with actual GPS coordinates from images
 * @param {string} imagesDir - Directory containing the 360° images
 * @param {string} outputFile - Path to write the updated imageData.js file
 * @returns {Promise<Object>} - The generated GeoJSON data
 */
export async function updateImageDataFile(
  imagesDir = 'public/street-view',
  outputFile = 'app/data/imageData.js'
) {
  try {
    // Get the full path to the images directory
    const fullImagesPath = path.resolve(process.cwd(), imagesDir);

    // Extract GPS data from all images in the directory
    console.log(`Extracting GPS data from images in ${fullImagesPath}...`);
    const gpsData = await extractGpsFromDirectory(fullImagesPath);

    // Count images with GPS data
    const imagesWithGps = Object.keys(gpsData).length;
    console.log(`Found GPS data for ${imagesWithGps} images`);

    if (imagesWithGps === 0) {
      throw new Error(
        'No GPS data found in any images. Cannot update imageData.js'
      );
    }

    // Generate GeoJSON from the GPS data
    const imageCollection = generateGeoJson(gpsData);

    // Generate the path LineString from the points
    const pathCoordinates = imageCollection.features.map(
      (feature) => feature.geometry.coordinates
    );
    const imagePath = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: pathCoordinates,
      },
    };

    // Create the file content
    const fileContent = `// This file was automatically generated from image EXIF data
// Generated on: ${new Date().toISOString()}

export const imageData = ${JSON.stringify(imageCollection, null, 2)};

// Generated path from the points
export const imagePath = ${JSON.stringify(imagePath, null, 2)};`;

    // Write to the output file
    fs.writeFileSync(path.resolve(process.cwd(), outputFile), fileContent);

    console.log(
      `Successfully updated ${outputFile} with GPS data from ${imagesWithGps} images`
    );

    return { imageCollection, imagePath };
  } catch (error) {
    console.error('Error updating imageData.js:', error);
    throw error;
  }
}
