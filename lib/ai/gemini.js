export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

function extractText(candidate) {
  return (candidate?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
}

export function createGeminiProvider({ apiKey, model = DEFAULT_GEMINI_MODEL }) {
  return {
    name: `gemini:${model}`,
    async generate({ prompt, schema, temperature, fetchImpl = fetch }) {
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
              responseSchema: schema,
            },
          }),
        },
      );
      const data = await response.json().catch(() => null);
      const candidate = data?.candidates?.[0];
      return {
        ok: response.ok,
        status: response.status,
        text: response.ok ? extractText(candidate) : "",
        finishReason: candidate?.finishReason || "unknown",
      };
    },
  };
}
