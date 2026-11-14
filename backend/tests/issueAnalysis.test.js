const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { classifyByRules, analyzeIssue } = require("../services/issueAnalysis");

// Starts a fake Ollama/Groq server that answers with `handler`
const startFake = (handler) =>
    new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            let body = "";
            req.on("data", (c) => (body += c));
            req.on("end", () => handler(req, res, body));
        });
        server.listen(0, "127.0.0.1", () => resolve(server));
    });

test("rules: whole-word matching avoids false positives", () => {
    assert.equal(classifyByRules("Back door", "classroom door is stuck").category, "Maintenance");
    // "classroom" must NOT be treated as a hostel room, "back" is not "ac"
    assert.notEqual(classifyByRules("Seats", "classroom seats are dirty").category, "Hostel");
});

test("rules: detects IT issue and urgent safety issue", () => {
    assert.equal(classifyByRules("WiFi down", "internet not working in lab").category, "IT");
    assert.equal(classifyByRules("Sparking", "fire risk near switchboard").priority, "Urgent");
});

test("ollama provider: uses AI result", async () => {
    const server = await startFake((req, res) => {
        assert.equal(req.url, "/api/generate");
        res.end(JSON.stringify({
            response: JSON.stringify({
                summary: "Lab WiFi is down.", category: "it", priority: "high"
            })
        }));
    });
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_URL = `http://127.0.0.1:${server.address().port}`;

    const r = await analyzeIssue("WiFi", "Lab wifi is down for everyone");
    assert.equal(r.category, "IT");
    assert.equal(r.priority, "High");
    assert.equal(r.aiSource, "ai");
    server.close();
});

test("groq provider: sends bearer key and parses chat response", async () => {
    let auth;
    const server = await startFake((req, res) => {
        auth = req.headers.authorization;
        assert.equal(req.url, "/chat/completions");
        res.end(JSON.stringify({
            choices: [{ message: { content: JSON.stringify({
                summary: "Book missing.", category: "Library", priority: "Low"
            }) } }]
        }));
    });
    process.env.AI_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-key";
    process.env.GROQ_BASE_URL = `http://127.0.0.1:${server.address().port}`;

    const r = await analyzeIssue("Book", "Cannot find the book on the shelf");
    assert.equal(auth, "Bearer test-key");
    assert.equal(r.category, "Library");
    assert.equal(r.aiSource, "ai");
    server.close();
});

test("falls back to rules when the AI is unreachable", async () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_URL = "http://127.0.0.1:1"; // nothing listens here
    const r = await analyzeIssue("WiFi", "internet not working");
    assert.equal(r.aiSource, "rules");
    assert.equal(r.category, "IT");
});

test("falls back to rules when the model returns garbage", async () => {
    const server = await startFake((req, res) =>
        res.end(JSON.stringify({ response: "not json at all" })));
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_URL = `http://127.0.0.1:${server.address().port}`;
    const r = await analyzeIssue("Leak", "water leak in corridor");
    assert.equal(r.aiSource, "rules");
    assert.equal(r.category, "Maintenance");
    server.close();
});

test("model cannot downgrade a safety emergency", async () => {
    const server = await startFake((req, res) =>
        res.end(JSON.stringify({ response: JSON.stringify({
            summary: "Fire.", category: "Maintenance", priority: "Low" }) })));
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_URL = `http://127.0.0.1:${server.address().port}`;
    const r = await analyzeIssue("Fire", "there is a fire in the lab");
    assert.equal(r.priority, "Urgent");
    server.close();
});

test("invalid category from model is ignored", async () => {
    const server = await startFake((req, res) =>
        res.end(JSON.stringify({ response: JSON.stringify({
            summary: "x", category: "Hacked", priority: "Whatever" }) })));
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_URL = `http://127.0.0.1:${server.address().port}`;
    const r = await analyzeIssue("WiFi", "internet not working");
    assert.equal(r.category, "IT");
    server.close();
});

test("AI_PROVIDER=none uses rules without calling anything", async () => {
    process.env.AI_PROVIDER = "none";
    const r = await analyzeIssue("Fan", "fan not working in room 4");
    assert.equal(r.aiSource, "rules");
}); 