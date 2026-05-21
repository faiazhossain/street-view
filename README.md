# ThirdEye360 - Street View Application

A Next.js application for viewing 360-degree street-level panoramas on an interactive map. Users click on map points to view panoramic images at those locations, navigate between images, and manage points of interest.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Map**: MapLibre GL JS via react-map-gl
- **Panorama Viewer**: Pannellum
- **State Management**: Redux Toolkit
- **UI**: Tailwind CSS, Ant Design, Flowbite React
- **Tile Data**: Vector tiles served from `tiles.bmapsbd.com`

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## How It Works: Click-to-View Flow

### Overview

The core user interaction is: **click a point on the map --> see a 360-degree panoramic image at that location**. Below is the complete technical walkthrough of every step, API call, and response involved.

### Architecture Diagram

```
User clicks map point
       |
       v
MapComponent (onMapClick)
       |
       v
  Is it a ThirdEye360 layer feature?
       |
      Yes
       |
       v
onImageSelect(feature.properties)  -->  page.js (handleImageSelect)
                                            |
                                            v
                                   Sets selectedImageId + selectedImageData
                                   Opens ImageViewer
                                            |
                                            v
                                   PannellumViewer receives selectedImage
                                            |
                                            v
                                   Resolves image URL (Drive / R2 / Direct)
                                   with fallback mechanism
                                            |
                                            v
                                   Proxies through /api/drive-proxy or /api/image-proxy
                                            |
                                            v
                                   Pannellum renders equirectangular panorama
```

---

### Step 1: Map Renders Vector Tile Points

**Source**: `app/components/MapComponent.js`

The map loads a vector tile source from the ThirdEye360 tile server:

```
Source URL: https://tiles.bmapsbd.com/ThirdEye360
Layer ID:   ThirdEye360
Source Layer: ThirdEye360
```

Each point on the map represents a captured panoramic image. The vector tiles contain feature properties including image IDs, coordinates, and image URLs.

### Step 2: User Clicks a Map Point

**Source**: `app/components/MapComponent.js` (lines 544-629, `onMapClick` handler)

When a user clicks the map:

1. The handler calls `map.queryRenderedFeatures(event.point)` to find features at the click position.
2. It checks if the clicked feature belongs to the `ThirdEye360` layer.
3. If it matches, and the app is in **normal mode** (not edit/delete/POI mode), the map recenters on the clicked point's coordinates.
4. It calls `onImageSelect(feature.properties)` -- passing the full feature properties object up to the parent page.

**What `feature.properties` contains:**

```json
{
  "id": "17_42",
  "latitude_snapped": 23.81033,
  "longitude_snapped": 90.41253,
  "latitude_original": 23.81035,
  "longitude_original": 90.41250,
  "imageUrl": "https://streetview.bmapsbd.com/api/track17/17_42.jpg",
  "imageUrl_Comp": "https://streetview.bmapsbd.com/api/track17/17_42_comp.jpg",
  "imageUrl_High": "https://streetview.bmapsbd.com/api/track17/17_42.jpg",
  "driveUrl_Comp": "https://drive.usercontent.google.com/download?id=1aBc...xyz",
  "driveUrl_High": "https://drive.usercontent.google.com/download?id=2dEf...abc",
  "initialYaw": 45.0,
  "initialPitch": 0,
  "initialHfov": 100,
  "next_id": "17_43",
  "previous_id": "17_41"
}
```

### Step 3: Page Handles the Selection

**Source**: `app/page.js` (lines 229-242, `handleImageSelect`)

The page component receives the image properties:

1. If `imageData` is an object (new behavior), it stores `imageData.id` as `selectedImageId` and the full object as `selectedImageData`.
2. It sets `showViewer = true` to open the image viewer panel.
3. It constructs a `selectedImage` object with `properties` and `geometry` (from snapped/original coordinates).
4. The browser URL is updated to `?id=<imageId>` so the view is shareable.

### Step 4: PannellumViewer Resolves the Image URL

**Source**: `app/components/viewer/pannellum/PannellumViewer.js` (lines 142-533)

Before rendering, the viewer determines which image URL to use:

#### 4a. URL Selection (HD vs Compressed)

```javascript
const getImageUrl = (properties, isHD) => {
  // HD mode
  driveUrl = properties.driveUrl_High      // Google Drive (HD)
  directUrl = properties.imageUrl_High      // Direct server URL (HD)

  // Compressed mode (default)
  driveUrl = properties.driveUrl_Comp       // Google Drive (compressed)
  directUrl = properties.imageUrl_Comp      // Direct server URL (compressed)
};
```

#### 4b. URL Proxying (`processImageUrl`)

External URLs are proxied through Next.js API routes to avoid CORS issues:

| Original URL Pattern | Proxied To |
|---|---|
| `drive.usercontent.google.com/download?id=<FILE_ID>` | `/api/drive-proxy?id=<FILE_ID>` |
| `*.r2.dev/*.jpg` | `/api/image-proxy?url=<ENCODED_URL>` |
| `streetview.bmapsbd.com/*.jpg` | `/api/image-proxy?url=<ENCODED_URL>` |

#### 4c. Fallback Mechanism

The viewer tries the Google Drive URL first. If it fails or times out (8 seconds), it falls back to the direct server URL:

```
Try Drive URL  ---(success)--->  Use Drive URL
      |
   (fail/timeout)
      |
      v
Use Direct URL as fallback
```

### Step 5: Image Proxy API Calls

#### `/api/drive-proxy` - Google Drive Image Proxy

**Source**: `app/api/drive-proxy/route.js`

**Request:**
```
GET /api/drive-proxy?id=<GOOGLE_DRIVE_FILE_ID>
```

**What it does:**
1. Receives a Google Drive file ID.
2. Constructs the download URL: `https://drive.usercontent.google.com/download?id=<FILE_ID>`.
3. Fetches the image from Google Drive.
4. Returns the image binary with CORS headers and 1-year cache.

**Response:**
```
Status: 200
Content-Type: image/jpeg (or actual content type)
Cache-Control: public, max-age=31536000, immutable
Access-Control-Allow-Origin: *
Body: <image binary data>
```

**Error Response:**
```json
{
  "error": "Failed to fetch image from Google Drive",
  "message": "Google Drive responded with status: 403"
}
```

#### `/api/image-proxy` - General Image Proxy

**Source**: `app/api/image-proxy/route.js`

**Request:**
```
GET /api/image-proxy?url=<ENCODED_IMAGE_URL>
```

**Domain allowlist:**
- `pub-e391f89429f54fe4a9e3f3444606ea62.r2.dev`
- `streetview.bmapsbd.com`

**What it does:**
1. Validates the target domain is in the allowlist.
2. Fetches the image from the external URL.
3. Returns the image binary with CORS headers and 1-year cache.

**Response:**
```
Status: 200
Content-Type: image/jpeg
Cache-Control: public, max-age=31536000, immutable
Access-Control-Allow-Origin: *
Body: <image binary data>
```

**Error responses:**
```json
// Missing URL (400)
{ "error": "Missing image URL" }

// Domain not allowed (403)
{ "error": "Domain not allowed" }

// Fetch failed (500)
{ "error": "Failed to fetch image", "message": "..." }
```

### Step 6: Pannellum Renders the Panorama

**Source**: `app/components/viewer/pannellum/PannellumViewer.js` (lines 538-563)

Once the image URL is resolved, Pannellum is initialized:

```javascript
window.pannellum.viewer(containerId, {
  type: "equirectangular",
  panorama: finalUrl,         // The resolved image URL
  autoLoad: true,
  yaw: initialYaw,            // Horizontal angle (from properties or saved state)
  pitch: initialPitch,         // Vertical angle
  hfov: initialHfov,           // Field of view (50-120 range)
  compass: true,
  northOffset: 247.5,
  hotSpots: [...],             // NEXT/PREV navigation hotspots
});
```

The viewer renders the full 360-degree equirectangular image with interactive pan/zoom controls.

### Step 7: Navigation Between Images

**Source**: `app/page.js` (lines 248-350)

When the user clicks NEXT or PREV (either the hotspot buttons inside the panorama or the floating nav buttons):

#### Next Image

1. Calls `handleNextImage()` in `page.js`.
2. Makes an API call:

```
GET https://streetview.bmapsbd.com/api/api/features/<next_id>
```

**API Response:**
```json
{
  "type": "Feature",
  "properties": {
    "id": "17_43",
    "latitude_snapped": 23.81040,
    "longitude_snapped": 90.41260,
    "imageUrl": "https://streetview.bmapsbd.com/api/track17/17_43.jpg",
    "imageUrl_Comp": "https://streetview.bmapsbd.com/api/track17/17_43_comp.jpg",
    "driveUrl_Comp": "https://drive.usercontent.google.com/download?id=...",
    "initialYaw": 45.0,
    "next_id": "17_44",
    "previous_id": "17_42"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [90.41260, 23.81040]
  }
}
```

3. If the API call fails, the app **falls back** to constructing URLs manually:
   ```
   https://streetview.bmapsbd.com/api/track<trackNumber>/<trackNumber>_<imageNumber>_comp.jpg
   ```
4. The URL is updated to `?id=<new_id>&yaw=<...>&pitch=<...>&hfov=<...>`.

#### Previous Image

Same flow as Next, but calls `handlePrevImage()` and decrements the image number. Will not navigate past image 0.

### Step 8: Shared Links / URL State

**Source**: `app/page.js` (lines 36-58, 352-408)

The browser URL tracks the current view state:

```
?id=17_42&yaw=45.00&pitch=-5.00&hfov=100.00
```

| Parameter | Description |
|---|---|
| `id` | Image feature ID (format: `<track>_<number>`) |
| `yaw` | Horizontal rotation in degrees |
| `pitch` | Vertical tilt in degrees |
| `hfov` | Horizontal field of view (zoom level) |

**When loading a shared link:**
1. On mount, `page.js` reads URL parameters.
2. If `id` is present, it calls `GET https://streetview.bmapsbd.com/api/api/features/<id>` to fetch the feature data.
3. If `yaw`/`pitch`/`hfov` are present, they are stored as `sharedViewState`.
4. After Pannellum loads, the shared view state is applied with a 500ms delay.

**URL updates during interaction:**
- URL is updated when the image changes.
- During panning/zooming, URL updates are debounced by 500ms.
- Updates only happen when view changes exceed thresholds (yaw > 2 degrees, pitch > 1 degree, hfov > 3 degrees).
- When the viewer is closed, the URL is reset to `/`.

---

## API Reference

### External APIs

| Endpoint | Method | Description |
|---|---|---|
| `https://streetview.bmapsbd.com/api/api/features/` | GET | Fetch all GeoJSON features (with local caching) |
| `https://streetview.bmapsbd.com/api/api/features/<id>` | GET | Fetch a single feature by ID |
| `https://streetview.bmapsbd.com/api/api/update-snapped-coordinates` | POST | Update feature coordinates (edit mode) |
| `https://streetview.bmapsbd.com/api/api/point-of-interest?lat=&lon=&rad=` | GET | Fetch POIs near coordinates |
| `https://streetview.bmapsbd.com/api/api/generate-poi` | POST | Generate POI data for an image |
| `https://tiles.bmapsbd.com/ThirdEye360` | Tiles | Vector tile source for map points |

### Internal API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/features` | GET | GeoJSON features with local cache (24h TTL) |
| `/api/features?track=<N>` | GET | Filter features by track number |
| `/api/features?refresh` | GET | Force refresh from remote API |
| `/api/drive-proxy?id=<FILE_ID>` | GET | Proxy Google Drive images |
| `/api/image-proxy?url=<ENCODED_URL>` | GET | Proxy images from R2/bmapsbd |

---

## Additional Features

### HD Mode

Toggle between compressed and high-resolution images. The HD button is shown in the bottom-right of the viewer. Uses `driveUrl_High`/`imageUrl_High` instead of the compressed variants.

### Point of Interest (POI)

- **Generate POI**: Sends the current image URL and coordinates to the backend for AI-based POI extraction.
- **View POI**: Fetches existing POIs within a 5-meter radius. Displays type, location, confidence score, and language.

### Edit Mode

Drag map points to update snapped coordinates. Sends a POST to `update-snapped-coordinates` with the new lat/lng.

### Delete Mode

Select individual points or draw a polygon to batch-delete features.

### View Position Memory

Redux stores the last yaw/pitch/hfov for each visited image. When navigating back to a previously viewed image, the camera returns to the saved position.

---

## Project Structure

```
app/
  page.js                          # Main page - orchestrates map + viewer
  components/
    MapComponent.js                # Map with vector tiles, click handling, modes
    MapSearchBar.js                # Search bar for location lookup
    viewer/
      ImageViewer.js               # Viewer container with controls and mini-map
      pannellum/
        PannellumViewer.js         # Pannellum 360 viewer initialization
    layout/
      PageLayout.js                # Page layout wrapper
  api/
    features/route.js              # GeoJSON features API with caching
    features/merge-all/route.js    # Extended features API with timeout
    drive-proxy/route.js           # Google Drive image proxy
    image-proxy/route.js           # General image proxy
  redux/
    slices/
      panoramaSlice.js             # View position storage per image
      uiControlsSlice.js           # UI control visibility state
  data/
    cached-geojson.json            # Local GeoJSON cache
```

## Key Dependencies

| Package | Purpose |
|---|---|
| `next` 14.2 | React framework |
| `maplibre-gl` / `react-map-gl` | Map rendering and interaction |
| `pannellum` | 360-degree panorama viewer |
| `@reduxjs/toolkit` / `react-redux` | State management |
| `antd` | UI component library |
| `flowbite-react` | UI component library |
| `react-hot-toast` | Toast notifications |
| `@turf/turf` | Geospatial calculations |
