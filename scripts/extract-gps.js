#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { updateImageDataFile } from '../app/utils/updateImageData.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Execute the GPS extraction process
async function main() {
  try {
    console.log('Starting GPS extraction from images...');
    const publicDir = resolve(__dirname, '../public/street-view');
    const outputFile = resolve(__dirname, '../app/data/imageData.js');

    await updateImageDataFile(publicDir, outputFile);
    console.log('GPS extraction completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during GPS extraction:', error);
    process.exit(1);
  }
}

main();
