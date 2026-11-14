import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import IssueTicket from "../components/IssueTicket";
import { StatusBadge } from "../components/Badges";
import { api } from "../api";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function ReportIssue() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState("");

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!image) {
            setPreview("");
            return undefined;
        }
        const url = URL.createObjectURL(image);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [image]);

    const pickImage = (e) => {
        const file = e.target.files[0];
        setError("");

        if (!file) {
            setImage(null);
            return;
        }
        if (!IMAGE_TYPES.includes(file.type)) {
            setError("Use a JPG, PNG or WebP image.");
            e.target.value = "";
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            setError("The image is larger than 5 MB. Choose a smaller one.");
            e.target.value = "";
            return;
        }
        setImage(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);

        const form = new FormData();
        form.append("title", title.trim());
        form.append("description", description.trim());
        form.append("location", location.trim());
        if (image) form.append("image", image);

        const { ok, data } = await api("/api/issues", { method: "POST", form });
        setBusy(false);

        if (!ok) {
            setError(data.message || "Could not submit your report.");
            return;
        }

        setResult({ issue: data.issue, related: data.relatedIssues || [] });
    };

    const reset = () => {
        setTitle("");
        setDescription("");
        setLocation("");
        setImage(null);
        setError("");
        setResult(null);
    };

    if (result) {
        const { issue, related } = result;
        return (
            <Layout title="Report received" subtitle="We have sent it to the right team.">
                <div className="stack" style={{ maxWidth: 820 }}>
                    <p style={{ margin: 0 }}>
                        Your report was sorted as <strong>{issue.category}</strong> with{" "}
                        <strong>{issue.priority.toLowerCase()}</strong> priority. You will get
                        a notification when staff pick it up.
                    </p>

                    <IssueTicket issue={issue} />

                    {related.length > 0 && (
                        <section className="panel">
                            <h2>Already reported at this location</h2>
                            <ul className="related">
                                {related.map((item) => (
                                    <li key={item._id}>
                                        {item.title} <StatusBadge status={item.status} />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <Link className="btn" to="/my-issues">View my issues</Link>
                        <button className="btn--ghost" onClick={reset}>Report another issue</button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout
            title="Report an issue"
            subtitle="Describe the problem. AI picks the category and priority for you."
        >
            <form className="form" onSubmit={handleSubmit}>
                {error && <div className="alert alert--error" role="alert">{error}</div>}

                <div className="field">
                    <label htmlFor="title">What is wrong?</label>
                    <input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="WiFi is down in Lab 3"
                        maxLength={120}
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="description">Details</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Since when, how many people are affected, anything staff should know."
                        maxLength={2000}
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="location">Where is it?</label>
                    <input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Lab 3, Block A"
                        maxLength={100}
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="image">Photo (optional)</label>
                    <input id="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} />
                    <span className="hint">JPG, PNG or WebP, up to 5 MB.</span>
                    {preview && <img className="preview" src={preview} alt="Selected upload preview" />}
                </div>

                <button type="submit" disabled={busy}>
                    {busy ? "Reading your report..." : "Submit report"}
                </button>
            </form>
        </Layout>
    );
}

export default ReportIssue; 