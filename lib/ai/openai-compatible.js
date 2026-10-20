// Works with any OpenAI-style /chat/completions API, such as Groq or OpenRouter.
export function createOpenAICompatibleProvider({ name, baseUrl, apiKey, model }) {
  return {
    name: `${name}:${model}`,
    async generate({ prompt, schema, temperature, fetchImpl = fetch }) {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: 8192,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Respond with a single JSON object that matches this JSON schema:\n${JSON.stringify(schema)}`,
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      const data = await response.json().catch(() => null);
      const choice = data?.choices?.[0];
      return {
        ok: response.ok,
        status: response.status,
        text: response.ok ? String(choice?.message?.content || "").trim() : "",
        finishReason: choice?.finish_reason || "unknown",
      };
    },
  };
}
