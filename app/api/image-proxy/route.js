// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing image URL" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate the URL is from an allowed domain
    const allowedDomains = [
      "pub-e391f89429f54fe4a9e3f3444606ea62.r2.dev",
      "streetview.bmapsbd.com",
    ];

    const parsedUrl = new URL(imageUrl);
    const isAllowed = allowedDomains.some((domain) =>
      parsedUrl.hostname.endsWith(domain),
    );

    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "Domain not allowed" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NextJS/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Image source responded with status: ${response.status}`,
      );
    }

    // Get the image data as a buffer
    const imageBuffer = await response.arrayBuffer();

    // Return the image with appropriate headers
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Image Proxy Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch image",
        message: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
