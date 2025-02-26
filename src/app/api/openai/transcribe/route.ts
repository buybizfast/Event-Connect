import { NextResponse } from "next/server";

// This is a simplified version of the transcribe API that will work during build
export async function POST(req: Request) {
  try {
    // Check if we're in a build/production environment without API keys
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // In a real request, we would process the audio here
    // For now, just return a mock response
    return NextResponse.json({
      text: "This is a mock transcription response for build purposes."
    });
  } catch (error) {
    console.error("Error processing audio:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio" },
      { status: 500 }
    );
  }
}
