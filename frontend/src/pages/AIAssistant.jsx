import { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

const SUGGESTIONS = [
    "How do I report a problem?",
    "How can I check the status of my issue?",
    "What can you help me with?"
];

function AIAssistant() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [busy, setBusy] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: "end" });
    }, [messages, busy]);

    const ask = async (text) => {
        const question = text.trim();
        if (!question || busy) return;

        setMessages((prev) => [...prev, { role: "user", text: question }]);
        setInput("");
        setBusy(true);

        const { ok, data } = await api("/api/ai/assistant", {
            method: "POST",
            body: { message: question }
        });

        setBusy(false);
        setMessages((prev) => [
            ...prev,
            {
                role: "assistant",
                text: ok
                    ? data.answer
                    : data.message || "The assistant could not answer. Try again.",
                error: !ok
            }
        ]);
    };

    const submit = (e) => {
        e.preventDefault();
        ask(input);
    };

    return (
        <Layout
            title="Campus assistant"
            subtitle="Ask how CampusConnect works. It cannot see or change your issues."
        >
            <div className="chat">
                <div className="chat__log" aria-live="polite">
                    {messages.length === 0 && !busy ? (
                        <div className="chat__empty">
                            <p>Ask a question to get started.</p>
                            <div className="chips">
                                {SUGGESTIONS.map((s) => (
                                    <button key={s} className="chip" onClick={() => ask(s)}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((m, i) => (
                            <div
                                key={i}
                                className={`bubble ${m.role === "user" ? "bubble--user" : "bubble--bot"} ${m.error ? "bubble--error" : ""}`}
                            >
                                {m.text}
                            </div>
                        ))
                    )}
                    {busy && <div className="bubble bubble--bot muted">Thinking...</div>}
                    <div ref={endRef} />
                </div>

                <form className="chat__form" onSubmit={submit}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your question"
                        aria-label="Your question"
                        maxLength={2000}
                    />
                    <button type="submit" disabled={busy || !input.trim()}>
                        Send
                    </button>
                </form>
            </div>
        </Layout>
    );
}

export default AIAssistant; 