// Next.js API route to proxy requests to the local API server
// and avoid CORS issues

export async function GET() {
  try {
    // Make the request to your local API server
    const response = await fetch("http://192.168.68.112:8000/api/features", {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Get the response data
    const data = await response.json();

    // Return the response with appropriate headers
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
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
