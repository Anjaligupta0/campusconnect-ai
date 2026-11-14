// Single place that talks to an LLM.
// AI_PROVIDER=ollama  -> local Ollama (development)
// AI_PROVIDER=groq    -> Groq's OpenAI-compatible API (deployment)
// AI_PROVIDER=none    -> AI disabled, the app uses rule-based fallbacks

const provider = () =>
    (process.env.AI_PROVIDER || "ollama").toLowerCase();

const timeoutMs = () => Number(process.env.AI_TIMEOUT_MS) || 20000;

async function callOllama(prompt, { json }) {
    const baseUrl = process.env.OLLAMA_URL || "http://localhost:11434";

    const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: process.env.OLLAMA_MODEL || "qwen2.5:1.5b",
            stream: false,
            ...(json ? { format: "json" } : {}),
            prompt
        }),
        signal: AbortSignal.timeout(timeoutMs())
    });

    if (!response.ok) {
        throw new Error(`Ollama responded with ${response.status}`);
    }

    const data = await response.json();
    return typeof data.response === "string" ? data.response.trim() : "";
}

async function callGroq(prompt, { json }) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not set");
    }

    const baseUrl =
        process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
            temperature: 0.2,
            messages: [{ role: "user", content: prompt }],
            ...(json ? { response_format: { type: "json_object" } } : {})
        }),
        signal: AbortSignal.timeout(timeoutMs())
    });

    if (!response.ok) {
        throw new Error(`Groq responded with ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim() : "";
}

/**
 * Send a prompt to the configured model and return the text answer.
 * Throws if AI is disabled or the call fails, so callers can fall back.
 */
async function generateText(prompt, { json = false } = {}) {
    const selected = provider();

    if (selected === "none") {
        throw new Error("AI is disabled (AI_PROVIDER=none)");
    }
    if (selected === "ollama") return callOllama(prompt, { json });
    if (selected === "groq") return callGroq(prompt, { json });

    throw new Error(`Unknown AI_PROVIDER "${selected}"`);
}

module.exports = { generateText, provider }; 