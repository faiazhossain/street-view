// Next.js API route to proxy requests for image files
// and avoid CORS issues

export async function GET(request, { params }) {
  try {
    // Get the path parameters
    const path = params.path || [];

    // Reconstruct the path
    const fullPath = path.join("/");

    // Extract the requested server IP from the URL query parameters
    const url = new URL(request.url);

    // Default to the new server IP address
    const serverIp = url.searchParams.get("server") || "192.168.68.183:8001";

    // Create the URL to the appropriate local server
    const proxyUrl = `http://${serverIp}/${fullPath}`;

    console.log(`Proxying request to: ${proxyUrl}`);

    // Make the request to the local server with a reasonable timeout
    const response = await fetch(proxyUrl, {
      timeout: 10000,
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }

    // Get the response as an array buffer for binary data
    const data = await response.arrayBuffer();

    // Get content type from original response
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Return the image data with appropriate headers
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        // Set CORS headers to ensure browser can use the image
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);

    // Return error response
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
