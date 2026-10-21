import type { AiAttempt, AiGenerateResult, AiProvider } from "../types";

const RETRY_INSTRUCTION = `

RETRY REQUIREMENTS:
- Return a complete JSON object within the token limit.
- Use only the authoritative growing-area IDs.
- Include at least one valid plant assigned to an existing growing area.
- Keep every required array and object in the response schema.`;

/**
 * Tries each provider in order. A provider gets one retry for a 429, a 5xx, or an
 * invalid response; any other error moves straight to the next provider. Returns
 * { plan, provider, attempts } or { plan: null, busy, attempts } when every provider failed.
 */
export interface GenerateOptions<T> {
  providers: AiProvider[];
  prompt: string;
  schema: unknown;
  /** Turns the provider's text into a validated result, or null when it is unusable. */
  parse: (text: string) => T | null;
  fetchImpl?: typeof fetch;
  onProvider?: (name: string) => void;
}

export type GenerateOutcome<T> =
  | { plan: T; provider: string; attempts: AiAttempt[]; busy?: undefined }
  | { plan: null; busy: boolean; attempts: AiAttempt[]; provider?: undefined };

export async function generateWithProviders<T>({
  providers,
  prompt,
  schema,
  parse,
  fetchImpl,
  onProvider,
}: GenerateOptions<T>): Promise<GenerateOutcome<T>> {
  const attempts: AiAttempt[] = [];
  let busy = false;

  for (const provider of providers) {
    onProvider?.(provider.name);
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let result: AiGenerateResult;
      try {
        result = await provider.generate({
          prompt: attempt === 1 ? prompt : `${prompt}${RETRY_INSTRUCTION}`,
          schema,
          temperature: attempt === 1 ? 0.25 : 0.1,
          fetchImpl,
        });
      } catch (error) {
        busy = true;
        attempts.push({ provider: provider.name, attempt, outcome: "network-error", detail: error instanceof Error ? error.message : undefined });
        break;
      }

      if (!result.ok) {
        const retryable = result.status === 429 || result.status >= 500;
        busy ||= retryable;
        attempts.push({ provider: provider.name, attempt, outcome: `http-${result.status}` });
        if (retryable) {
          continue;
        }
        break;
      }

      const plan = result.text ? parse(result.text) : null;
      if (plan) {
        attempts.push({ provider: provider.name, attempt, outcome: "ok" });
        return { plan, provider: provider.name, attempts };
      }
      attempts.push({
        provider: provider.name,
        attempt,
        outcome: result.text ? "semantic-validation" : "empty-or-truncated-response",
        detail: result.finishReason,
      });
    }
  }

  return { plan: null, busy, attempts };
}
