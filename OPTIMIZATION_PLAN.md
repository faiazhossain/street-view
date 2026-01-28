# ThirdEye360 - Optimization & Improvement Plan

**Analysis Date:** 2026-01-28
**Project:** Street View Platform
**Tech Stack:** Next.js 14, React 18, MapLibre GL, Pannellum, Redux Toolkit

---

## Executive Summary

This comprehensive analysis identifies optimization opportunities across code quality, performance, security, best practices, and user experience. The project shows good overall architecture but has several areas for improvement.

**Key Metrics:**

- 33 JavaScript files
- ~11,000+ lines of code
- Next.js 14 with App Router
- Client-heavy architecture with significant state management

---

## Priority Matrix

| Priority  | Category      | Issue                                      | Impact                  |
| --------- | ------------- | ------------------------------------------ | ----------------------- |
| ✅ Fixed  | Performance   | URL update interval running every second   | User experience         |
| ✅ Fixed  | Performance   | Missing React.memo on expensive components | Render performance      |
| 🔴 High   | Code Quality  | Duplicate code in image ID parsing logic   | Maintainability         |
| 🟡 Medium | Performance   | Missing image optimization                 | Load performance        |
| 🟡 Medium | Security      | No environment variable validation         | Security risk           |
| 🟡 Medium | Best Practice | Missing error boundaries                   | Stability               |
| 🟢 Low    | Code Quality  | Missing TypeScript                         | Type safety             |

---

## 1. Performance Optimizations

### 1.1 URL Update Interval Issue ✅ FIXED

**Location:** `app/page.js:95-176`

**Status:** Resolved

**Previous Problem:**
URL was being updated every second using `setInterval`, causing performance overhead and poor UX.

**Solution Implemented:**

```javascript
// Lines 13-18: View state change thresholds
const VIEW_CHANGE_THRESHOLD = {
  yaw: 2,    // Update only if yaw changes by more than 2 degrees
  pitch: 1,  // Update only if pitch changes by more than 1 degree
  hfov: 3,   // Update only if hfov changes by more than 3 degrees
};

// Lines 95-176: Event-driven debounced URL updates
// - Only updates on significant view changes
// - Uses 500ms debounce after user stops interacting
// - Listens to: mousedown, mouseup, wheel, touchstart, touchend, keydown
// - Properly cleans up event listeners
```

**Benefits:**
- No more unnecessary URL updates every second
- Performance improvement from reduced router.replace calls
- Better user experience without flickering URL
- Event-driven approach instead of polling

**Priority:** High - COMPLETED

---

### 1.2 Missing React.memo on Expensive Components ✅ FIXED

**Location:**
- `app/components/MapComponent.js`
- `app/components/viewer/PannellumViewer.js`
- `app/components/viewer/ImageViewer.js`

**Status:** Resolved

**Previous Problem:**
These large components (1167, 806, and 361 lines respectively) were re-rendering on every parent state change, even when props hadn't changed.

**Solution Implemented:**

**MapComponent:**
```javascript
export default React.memo(MapComponent, (prevProps, nextProps) => {
  return (
    prevProps.selectedImageId === nextProps.selectedImageId &&
    prevProps.selectedImage === nextProps.selectedImage &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.isCompact === nextProps.isCompact
  );
});
```

**ImageViewer:**
```javascript
export default React.memo(ImageViewer, (prevProps, nextProps) => {
  return (
    prevProps.selectedImage === nextProps.selectedImage &&
    prevProps.isLoadingFeature === nextProps.isLoadingFeature &&
    prevProps.sharedViewState === nextProps.sharedViewState
  );
});
```

**PannellumViewer:**
```javascript
export default React.memo(PannellumViewer, (prevProps, nextProps) => {
  return (
    prevProps.selectedImage === nextProps.selectedImage &&
    prevProps.sharedViewState === nextProps.sharedViewState
  );
});
```

**Benefits:**
- Prevents unnecessary re-renders when parent state changes
- Improved render performance for large components
- Better CPU utilization during user interactions
- Smoother UI experience

**Priority:** Medium - COMPLETED

---

### 1.3 Pannellum Instance Re-creation 🟡

**Location:** `app/components/viewer/pannellum/PannellumViewer.js:252-437`

**Problem:**
The entire Pannellum instance is destroyed and recreated on:

- HD mode toggle
- Image changes
- Control visibility changes

This causes:

- Flash of unstyled content
- Memory spikes
- Poor UX during transitions

**Recommendation:**

- Use Pannellum's scene API to update panorama instead of destroying
- Implement proper asset preloading for next/previous images
- Add transition overlays

**Priority:** Medium

---

### 1.4 Deep Cloning in MapComponent 🟡

**Location:** `app/components/MapComponent.js:107-120`

**Problem:**

```javascript
const getPointsFeatureCollection = (features) => {
  return {
    type: "FeatureCollection",
    features: features.map((feature) => {
      // Make a deep copy to avoid mutating the original
      const newFeature = JSON.parse(JSON.stringify(feature));
      newFeature.geometry.coordinates = getCoordinates(feature);
      return newFeature;
    }),
  };
};
```

Deep cloning with JSON.parse/stringify is expensive and called frequently.

**Recommendation:**

- Use structured clone or shallow copy with only coordinate mutation
- Memoize the result based on features and useSnappedCoordinates

**Priority:** Medium

---

### 1.5 Missing Image Optimization 🔴

**Location:** Various image URLs throughout the app

**Problem:**
Images are loaded directly without:

- Responsive sizing
- Format optimization (WebP/AVIF)
- Lazy loading
- Priority hints

**Recommendation:**

- Use Next.js Image component for static images
- Implement lazy loading for panorama tiles
- Add image preloading for next/prev navigation
- Consider using CDN with image optimization

**Priority:** High

---

## 2. Code Quality Issues

### 2.1 Duplicate Code - Image ID Parsing 🔴

**Locations:**

- `app/page.js:120-134`
- `app/components/viewer/ImageViewer.js:17-31`
- `app/components/viewer/pannellum/PannellumViewer.js:282-291`

**Problem:**
The `parseImageId` function is duplicated in 3+ files.

**Recommendation:**

```javascript
// app/utils/imageUtils.js
export const parseImageId = (id) => {
  if (!id) return { trackNumber: 0, imageNumber: 0 };
  const idMatch = String(id).match(/^(\d+)_(\d+)/);
  if (idMatch) {
    return {
      trackNumber: parseInt(idMatch[1], 10),
      imageNumber: parseInt(idMatch[2], 10),
    };
  }
  return { trackNumber: 0, imageNumber: 0 };
};
```

**Priority:** High

---

### 2.2 Inconsistent Property Access 🔴

**Locations:** Throughout the codebase

**Problem:**

```javascript
// Inconsistent access patterns
selectedImage.properties.id || selectedImage.properties.id;
```

This redundant check appears multiple times (lines 90, 195-196, 217, 350-351 in ImageViewer.js).

**Recommendation:**

- Standardize property access with a single source of truth
- Create a selector utility for safe property access

**Priority:** High

---

### 2.3 Magic Numbers and Hard-coded Values 🟡

**Locations:** Throughout the codebase

**Examples:**

```javascript
// page.js:104 - update interval
}, 1000);

// ImageViewer.js:123-124 - autoplay timing
}, 6000);

// PannellumViewer.js:390 - north offset
northOffset: 247.5,
```

**Recommendation:**

```javascript
// app/constants/viewer.js
export const VIEWER_CONFIG = {
  URL_UPDATE_DEBOUNCE_MS: 500,
  AUTOPLAY_INTERVAL_MS: 6000,
  NORTH_OFFSET: 247.5,
  MIN_HFOV: 50,
  MAX_HFOV: 120,
} as const;
```

**Priority:** Medium

---

### 2.4 Large Component Files 🟡

**Locations:**

- `MapComponent.js` (1167 lines)
- `PannellumViewer.js` (806 lines)
- `page.js` (431 lines)

**Problem:**
Large files are difficult to:

- Navigate and understand
- Test in isolation
- Maintain and debug

**Recommendation:**

- Extract custom hooks (useMapState, useMapInteraction)
- Split into sub-components
- Use composition over monolithic components

**Priority:** Medium

---

### 2.5 Missing TypeScript 🟢

**Location:** Entire project

**Problem:**

- No type safety
- Runtime errors for type mismatches
- Poor IDE autocomplete
- Harder refactoring

**Recommendation:**

- Migrate to TypeScript gradually
- Start with utility functions and constants
- Use JSDoc for transition period
- Enable strict mode once comfortable

**Priority:** Low (large effort)

---

## 3. Security Concerns

### 3.1 Missing Environment Variable Validation 🔴

**Location:** API routes and configuration

**Problem:**

- API URLs are hard-coded in multiple places
- No validation of required environment variables
- Sensitive data might be exposed

**Recommendation:**

```javascript
// app/config/env.js
const requiredEnvVars = ["NEXT_PUBLIC_API_BASE_URL", "API_SECRET_KEY"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  // ...
};
```

**Priority:** High

---

### 3.2 API Key Exposure Risk 🟡

**Location:** `app/components/MapComponent.js:275-276`

**Problem:**

```javascript
mapStyle={darkMode
  ? "https://map.barikoi.com/styles/barikoi-dark-mode/style.json?key=NDE2NzpVNzkyTE5UMUoy"
  : "https://map.barikoi.com/styles/osm_barikoi_v2/style.json?key=NDE2NzpVNzkyTE5UMUoy"
}
```

API key is exposed in client-side code.

**Recommendation:**

- Move to environment variable
- Use proxy API route if key should be secret
- Implement rate limiting on backend
- Consider using map tile proxy

**Priority:** Medium

---

### 3.3 Unvalidated User Input 🟡

**Location:** URL parameters in `app/page.js:284-314`

**Problem:**
URL parameters are used without validation:

```javascript
const imageId = searchParams.get("id");
const yaw = searchParams.get("yaw");
const pitch = searchParams.get("pitch");
const hfov = searchParams.get("hfov");
```

**Recommendation:**

```javascript
const parseAndValidateNumber = (value, min, max, defaultValue) => {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
};

const yaw = parseAndValidateNumber(searchParams.get("yaw"), -180, 180, 0);
const pitch = parseAndValidateNumber(searchParams.get("pitch"), -90, 90, 0);
const hfov = parseAndValidateNumber(searchParams.get("hfov"), 50, 120, 100);
```

**Priority:** Medium

---

### 3.4 CORS and Content Security Policy 🟡

**Location:** `next.config.mjs`

**Problem:**
Missing CSP headers and CORS configuration.

**Recommendation:**

```javascript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:;",
          },
        ],
      },
    ];
  },
};
```

**Priority:** Medium

---

## 4. Best Practices

### 4.1 Missing Error Boundaries 🟡

**Location:** Root layout and major components

**Problem:**
No error boundaries to gracefully handle component errors.

**Recommendation:**

```javascript
// app/components/ErrorBoundary.js
"use client";
import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='error-container'>
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Priority:** Medium

---

### 4.2 Console Logs in Production 🟡

**Locations:** Throughout the codebase

**Examples:**

```javascript
// page.js:33
console.log(params, "params");

// page.js:161
console.log("🚀 ~ Home ~ imageData:", imageData);

// MapComponent.js:200
console.log("Delete result:", result);
```

**Recommendation:**

- Remove all console.logs for production
- Use a logging utility that can be disabled
- Keep only console.error for critical issues
- Add debug logging behind a feature flag

**Priority:** Medium

---

### 4.3 Redux Store Underutilized 🟡

**Location:** `app/redux/`

**Problem:**
Redux is set up but only stores:

- View positions (panoramaSlice)
- UI control visibility (uiControlsSlice)

Many component states could be in Redux:

- selectedImageId
- showViewer
- miniMapViewState
- POI data

**Recommendation:**

- Either use Redux more comprehensively or remove it
- Consider using React Context for simpler state management
- Current implementation adds complexity without full benefit

**Priority:** Medium

---

### 4.4 Missing Loading States 🟡

**Location:** Various async operations

**Problem:**
Some async operations lack proper loading/error states:

- Feature fetching in page.js
- POI generation
- Map tile loading

**Recommendation:**

- Implement consistent loading patterns
- Use skeleton screens where appropriate
- Add error retry mechanisms
- Show progress for long operations

**Priority:** Medium

---

### 4.5 Accessibility Issues 🟢

**Locations:** Various interactive elements

**Issues Found:**

- Missing ARIA labels on some buttons
- No focus management in modal
- Missing keyboard navigation for map
- No screen reader announcements for image changes

**Recommendation:**

```javascript
<button
  onClick={toggleHDMode}
  aria-label={isHDMode ? 'Disable HD mode' : 'Enable HD mode'}
  aria-pressed={isHDMode}
  role="switch"
>
```

**Priority:** Low

---

## 5. Architecture & Design

### 5.1 API Data Fetching Strategy 🟡

**Location:** `app/api/features/route.js`

**Current Implementation:**

- Caches to local file system
- Manual cache invalidation
- No cache TTL or stale-while-revalidate

**Recommendation:**

```javascript
// Use a proper caching solution
// Option 1: Next.js built-in fetch with revalidate
export async function GET() {
  const response = await fetch(API_URL, {
    next: { revalidate: 3600 }, // 1 hour
  });
  return response;
}

// Option 2: Use Redis or similar for distributed cache
// Option 3: Use SWR or React Query on client side
```

**Priority:** Medium

---

### 5.2 Component Prop Drilling 🟡

**Location:** Multiple component hierarchies

**Problem:**
Props like `selectedImageId`, `selectedImageData`, `onImageSelect` are passed through multiple layers.

**Recommendation:**

- Use React Context for shared state
- Consider compound component pattern
- Use Redux store more comprehensively
- Implement custom hooks for data access

**Priority:** Medium

---

### 5.3 State Synchronization Issues 🟡

**Location:** Multiple locations

**Problem:**

- `selectedImageId` and `selectedImageData` can get out of sync
- `selectedFeature` in MapComponent vs `selectedImage` in parent
- Multiple sources of truth for same data

**Recommendation:**

- Single source of truth for selected image
- Use derived state where possible
- Implement state synchronization via Redux or Context

**Priority:** Medium

---

### 5.4 Missing Service Layer 🔴

**Location:** API calls throughout components

**Problem:**
API calls are scattered across components:

- `app/page.js:142-158` (fetchFeatureById)
- `app/components/MapComponent.js:179-216` (delete API)
- `app/components/viewer/pannellum/PannellumViewer.js:132-161` (POI generation)

**Recommendation:**

```javascript
// app/services/api.js
class ApiService {
  static async getFeatureById(id) {
    const response = await fetch(`${API_BASE}/features/${id}`);
    if (!response.ok) throw new ApiError(response.status);
    return response.json();
  }

  static async deleteFeatures(featureIds) {
    // ...
  }
}
```

**Priority:** High

---

## 6. Testing

### 6.1 Zero Test Coverage 🔴

**Location:** Entire project

**Problem:**
No test files found in the project.

**Recommendation:**

```javascript
// Example test structure:
// __tests__/
//   components/
//     MapComponent.test.js
//     ImageViewer.test.js
//   utils/
//     imageUtils.test.js
//   hooks/
//     useImageData.test.js
```

Start with:

1. Unit tests for utility functions
2. Component tests for critical UI flows
3. Integration tests for API routes
4. E2E tests with Playwright for user journeys

**Priority:** High

---

### 6.2 Missing Performance Monitoring 🟡

**Location:** Application-wide

**Problem:**
No performance tracking or monitoring.

**Recommendation:**

- Add Web Vitals tracking
- Implement custom metrics for:
  - Image load times
  - Map tile load times
  - Panorama initialization time
- Use profiling to identify bottlenecks

**Priority:** Medium

---

## 7. Build & Deployment

### 7.1 Bundle Size Optimization 🟡

**Location:** `package.json` dependencies

**Concerns:**

- Large dependencies: maplibre-gl, @turf/turf, antd
- Multiple UI libraries (antd + flowbite-react)
- No bundle analysis

**Recommendation:**

```javascript
// next.config.mjs
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@ant-design/icons", "react-icons"],
  },
  webpack: (config) => {
    config.optimization.usedExports = true;
    return config;
  },
};
```

Run bundle analyzer:

```bash
npm install @next/bundle-analyzer
# Add to next.config.mjs
```

**Priority:** Medium

---

### 7.2 Missing Production Optimizations 🟡

**Location:** `next.config.mjs`

**Current Config:**

```javascript
const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: new URL("./", import.meta.url).pathname,
  },
};
```

**Recommendation:**

```javascript
const nextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: new URL("./", import.meta.url).pathname,
    optimizeCss: true,
  },
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};
```

**Priority:** Medium

---

## 8. Documentation

### 8.1 Missing Code Comments 🟡

**Location:** Throughout codebase

**Problem:**
Complex logic lacks explanation:

- Image ID parsing
- View state management
- Pannellum lifecycle
- Map coordinate transformations

**Recommendation:**
Add JSDoc comments for:

- All utility functions
- Complex algorithms
- Component prop interfaces
- API contracts

**Priority:** Medium

---

### 8.2 Missing README 🟢

**Location:** Project root

**Problem:**
No project documentation for:

- Setup instructions
- Development workflow
- Architecture overview
- Deployment process

**Recommendation:**
Create comprehensive README with:

- Project overview
- Prerequisites
- Installation steps
- Development commands
- Environment variables
- Architecture diagram
- Contributing guidelines

**Priority:** Low

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 weeks)

1. Remove duplicate code (parseImageId utility)
2. Fix URL update interval
3. Add environment variable validation
4. Remove console.logs
5. Add basic error boundaries

### Phase 2: Performance (2-3 weeks)

1. Implement React.memo for expensive components
2. Add image lazy loading
3. Fix Pannellum instance management
4. Optimize deep cloning operations
5. Add bundle analysis

### Phase 3: Code Quality (2-3 weeks)

1. Extract service layer
2. Create custom hooks
3. Split large components
4. Add TypeScript to utilities
5. Implement proper state management

### Phase 4: Testing & Monitoring (2-3 weeks)

1. Add unit tests for utilities
2. Add component tests
3. Set up performance monitoring
4. Add Web Vitals tracking
5. Implement error tracking

### Phase 5: Security & Hardening (1-2 weeks)

1. Add CSP headers
2. Validate user input
3. Secure API keys
4. Add rate limiting
5. Implement proper CORS

---

## Summary Statistics

| Category       | Critical | High  | Medium | Low   | Total  |
| -------------- | -------- | ----- | ------ | ----- | ------ |
| Performance    | 0        | 1     | 4      | 0     | 5      |
| Code Quality   | 0        | 3     | 3      | 2     | 8      |
| Security       | 0        | 2     | 3      | 0     | 5      |
| Best Practices | 0        | 1     | 5      | 2     | 8      |
| Architecture   | 1        | 1     | 3      | 0     | 5      |
| Testing        | 1        | 0     | 1      | 0     | 2      |
| Build/Deploy   | 0        | 0     | 2      | 0     | 2      |
| Documentation  | 0        | 0     | 1      | 1     | 2      |
| **TOTAL**      | **2**    | **8** | **22** | **5** | **37** |

---

## Next Steps

1. **Review this plan** with the team
2. **Prioritize** based on business impact
3. **Create tickets** in your project management system
4. **Start with Phase 1** quick wins
5. **Track progress** with regular checkpoints

---

**Generated by:** Claude Code Analysis
**Questions?** Refer to specific line numbers for implementation details
