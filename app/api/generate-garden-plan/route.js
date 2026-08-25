import { NextResponse } from "next/server";
import {
  buildLayoutGenerationPrompt,
  createExampleGardenLayout,
  parseLayoutFromLlmText,
} from "../../../lib/garden-layout";

const DEFAULT_MODEL = "gemini-3.6-flash";

function extractTextFromCandidate(candidate) {
  if (!candidate?.content?.parts) {
    return "";
  }

  return candidate.content.parts
    .map((part) => part.text || "")
    .join("")
    .trim();
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const configuredModel = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const prompt = payload?.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const modelPrompt = buildLayoutGenerationPrompt(prompt);

  try {
    const modelsToTry =
      configuredModel === DEFAULT_MODEL
        ? [configuredModel]
        : [configuredModel, DEFAULT_MODEL];

    let lastErrorMessage = "Gemini API request failed.";

    for (const model of modelsToTry) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: modelPrompt }] }],
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 1400,
            },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        lastErrorMessage =
          data?.error?.message ||
          "Gemini API request failed. Check GEMINI_MODEL and GEMINI_API_KEY.";

        // Retry once on fallback model when configured model is unavailable.
        if (
          response.status === 404 &&
          model !== DEFAULT_MODEL &&
          modelsToTry.includes(DEFAULT_MODEL)
        ) {
          continue;
        }

        return NextResponse.json({ error: lastErrorMessage }, { status: response.status });
      }

      const firstCandidate = data?.candidates?.[0];
      const text = extractTextFromCandidate(firstCandidate);
      const layout = parseLayoutFromLlmText(text);

      if (!text || !layout) {
        lastErrorMessage = "Gemini returned invalid layout JSON.";
        continue;
      }

      return NextResponse.json({ layout, modelUsed: model });
    }

    // Return a safe fallback example so users can still see the sketch pipeline.
    return NextResponse.json(
      {
        layout: createExampleGardenLayout(),
        modelUsed: "fallback-example",
        warning: lastErrorMessage,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        layout: createExampleGardenLayout(),
        modelUsed: "fallback-example",
        warning: "Unable to reach Gemini API. Showing example layout.",
      },
      { status: 200 },
    );
  }
}
