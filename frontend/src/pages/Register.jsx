import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { api } from "../api";

function Register() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        department: ""
    });
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setBusy(true);
        // New accounts are always students. Admins promote staff later.
        const { ok, data } = await api("/api/auth/register", {
            method: "POST",
            body: form
        });
        setBusy(false);

        if (!ok) {
            setError(data.message || "Could not create your account.");
            return;
        }
        setDone(true);
    };

    if (done) {
        return (
            <AuthShell
                heading="Account created"
                sub="You can log in now."
                footer=""
            >
                <p style={{ marginTop: "1.5rem" }}>
                    <Link className="btn" to="/login">Go to log in</Link>
                </p>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            heading="Create your account"
            sub="Students can report and track campus issues."
            footer={
                <>
                    Already registered? <Link to="/login">Log in</Link>
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                {error && <div className="alert alert--error" role="alert">{error}</div>}

                <div className="field">
                    <label htmlFor="name">Full name</label>
                    <input id="name" name="name" autoComplete="name" value={form.name} onChange={handleChange} maxLength={80} required />
                </div>

                <div className="field">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" name="email" autoComplete="email" value={form.email} onChange={handleChange} required />
                </div>

                <div className="field">
                    <label htmlFor="password">Password</label>
                    <input id="password" type="password" name="password" autoComplete="new-password" value={form.password} onChange={handleChange} required />
                    <span className="hint">At least 8 characters.</span>
                </div>

                <div className="field">
                    <label htmlFor="department">Department (optional)</label>
                    <input id="department" name="department" value={form.department} onChange={handleChange} />
                </div>

                <button type="submit" disabled={busy}>
                    {busy ? "Creating account..." : "Create account"}
                </button>
            </form>
        </AuthShell>
    );
}

export default Register; 