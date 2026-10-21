import type { PlanResponseBody, PlanStreamEvent } from "../types";

export const LOADING_STAGES = ["climate", "generating", "result"];

/**
 * Reads an NDJSON plan stream, calling onEvent for each event, and resolves with the
 * result body. Rejects on an error event or a stream that ends without a result.
 */
export async function readPlanStream(
  response: Response,
  onEvent: (event: PlanStreamEvent) => void = () => {},
): Promise<PlanResponseBody> {
  if (!response.body) {
    throw new TypeError("The plan response has no body.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let resultBody: PlanResponseBody | null = null;

  const handleLine = (line: string) => {
    if (!line.trim()) {
      return;
    }
    // The stream comes from our own planEventStream, so its events are trusted to match.
    const event = JSON.parse(line) as PlanStreamEvent;
    onEvent(event);
    if (event.type === "error") {
      throw new Error(event.error || "Failed to generate a garden plan.");
    }
    if (event.type === "result") {
      resultBody = event.body;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handleLine);
    if (done) {
      handleLine(buffer);
      break;
    }
  }

  if (!resultBody) {
    throw new Error("The plan stream ended before a result arrived.");
  }
  return resultBody;
}

/** Display label for a provider name like "gemini:gemini-3.6-flash". */
export function providerLabel(provider: string | null | undefined): string {
  if (!provider || provider === "starter-plan") {
    return "Building a starter plan";
  }
  if (provider === "cache") {
    return "Loading your saved result";
  }
  const name = String(provider).split(":")[0];
  return `Asking ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}
