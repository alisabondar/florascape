import { NextResponse } from "next/server";
import {
  buildGardenPlanGenerationPrompt,
  createFallbackGardenPlan,
  GARDEN_PLAN_RESPONSE_SCHEMA,
  normalizePlannerInput,
  parseGardenPlanFromLlmText,
} from "../../../lib/garden-plan";

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

  const plannerInput = normalizePlannerInput(payload?.plannerInput);
  if (!plannerInput) {
    return NextResponse.json({ error: "Valid planner input is required." }, { status: 400 });
  }

  const currentDate = new Date().toISOString().slice(0, 10);
  const modelPrompt = buildGardenPlanGenerationPrompt(plannerInput, currentDate);
  const fallbackPlan = createFallbackGardenPlan(plannerInput);

  try {
    const modelsToTry =
      configuredModel === DEFAULT_MODEL
        ? [configuredModel]
        : [configuredModel, DEFAULT_MODEL];

    let lastErrorMessage = "We could not validate the custom plan, so a starter plan is shown instead.";

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const retryInstruction =
          attempt === 1
            ? ""
            : `\n\nRETRY REQUIREMENTS:\n- Return a complete JSON object within the token limit.\n- Use only the authoritative growing-area IDs.\n- Include at least one valid plant assigned to an existing growing area.\n- Keep every required array and object in the response schema.`;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${modelPrompt}${retryInstruction}` }] }],
              generationConfig: {
                temperature: attempt === 1 ? 0.25 : 0.1,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
                responseSchema: GARDEN_PLAN_RESPONSE_SCHEMA,
              },
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          const serviceMessage =
            data?.error?.message ||
            "Gemini API request failed. Check GEMINI_MODEL and GEMINI_API_KEY.";

          // Move to the fallback model when the configured model is unavailable.
          if (
            response.status === 404 &&
            model !== DEFAULT_MODEL &&
            modelsToTry.includes(DEFAULT_MODEL)
          ) {
            break;
          }

          if (response.status === 429 || response.status >= 500) {
            lastErrorMessage =
              "The custom planner is temporarily busy, so a starter plan is shown instead.";
            if (attempt < 2) {
              continue;
            }
            break;
          }

          return NextResponse.json({ error: serviceMessage }, { status: response.status });
        }

        const firstCandidate = data?.candidates?.[0];
        const text = extractTextFromCandidate(firstCandidate);
        const plan = parseGardenPlanFromLlmText(text, plannerInput);

        if (text && plan) {
          return NextResponse.json({ plan, modelUsed: model });
        }

        console.warn("Garden plan response rejected", {
          model,
          attempt,
          finishReason: firstCandidate?.finishReason || "unknown",
          reason: text ? "semantic-validation" : "empty-or-truncated-response",
        });
      }
    }

    return NextResponse.json(
      {
        plan: fallbackPlan,
        modelUsed: "fallback-example",
        warning: lastErrorMessage,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        plan: fallbackPlan,
        modelUsed: "fallback-example",
        warning: "Unable to reach Gemini API. Showing a starter plan based on your dimensions.",
      },
      { status: 200 },
    );
  }
}
