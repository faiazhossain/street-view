// Simplified API route to fetch and format image data
// No proxy needed - direct image URLs from server

export async function GET() {
  try {
    // Make the request to your API server
    const response = await fetch('http://202.72.236.166:8001/api/features', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    // Get the response data
    const rawData = await response.json();

    // Validate data format
    if (!rawData || !rawData.data || !Array.isArray(rawData.data)) {
      throw new Error('Invalid API response format');
    }

    // Format data for the map component (GeoJSON format)
    const formattedData = {
      type: 'FeatureCollection',
      features: rawData.data.map((item) => ({
        type: 'Feature',
        properties: {
          id: item.feature_id || item.id,
          // Use direct image URLs from server
          imageUrl: item.image_url_comp,
          imageUrl_High: item.image_url_high,
          imageUrl_Comp: item.image_url_comp,
          initialYaw: item.initial_yaw || 0,
          initialPitch: item.initial_pitch || 0,
          initialHfov: item.initial_hfov || 100,
          showCompass: item.show_compass !== false,
          // Coordinate data
          longitude_original: parseFloat(item.longitude_original || 0),
          latitude_original: parseFloat(item.latitude_original || 0),
          longitude_snapped: parseFloat(item.longitude_snapped || 0),
          latitude_snapped: parseFloat(item.latitude_snapped || 0),
          created_at: item.created_at,
        },
        geometry: {
          type: 'Point',
          // Use snapped coordinates for map display
          coordinates: [
            parseFloat(item.longitude_snapped || item.longitude_original || 0),
            parseFloat(item.latitude_snapped || item.latitude_original || 0),
          ],
        },
      })),
    };

    // Return the formatted response
    return new Response(JSON.stringify(formattedData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('API Error:', error);

    return new Response(
      JSON.stringify({
        status: 'error',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
