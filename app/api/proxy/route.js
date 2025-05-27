// Next.js API route to proxy image requests
// to avoid CORS issues

export async function GET(request) {
  try {
    // Get the image URL from the query parameter
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Image URL is required" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Make the request to the target server
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the content type from the response
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Get the image data as a buffer
    const imageData = await response.arrayBuffer();

    // Return the image with appropriate headers
    return new Response(imageData, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to proxy the image",
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
