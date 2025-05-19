// Next.js API route to proxy requests for image files
// and avoid CORS issues

export async function GET(request, { params }) {
  try {
    // Get the path parameters
    const path = params.path || [];

    // Reconstruct the path
    const fullPath = path.join("/");

    // Create the URL to the local server
    const url = `http://192.168.68.112:8000/${fullPath}`;

    console.log(`Proxying request to: ${url}`);

    // Make the request to the local server
    const response = await fetch(url);

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
