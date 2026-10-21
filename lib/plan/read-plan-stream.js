export const LOADING_STAGES = ["climate", "generating", "result"];

/**
 * Reads an NDJSON plan stream, calling onEvent for each event, and resolves with the
 * result body. Rejects on an error event or a stream that ends without a result.
 */
export async function readPlanStream(response, onEvent = () => {}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let resultBody = null;

  const handleLine = (line) => {
    if (!line.trim()) {
      return;
    }
    const event = JSON.parse(line);
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
    buffer = lines.pop();
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
export function providerLabel(provider) {
  if (!provider || provider === "starter-plan") {
    return "Building a starter plan";
  }
  if (provider === "cache") {
    return "Loading your saved result";
  }
  const name = String(provider).split(":")[0];
  return `Asking ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}
