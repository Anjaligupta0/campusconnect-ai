import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { api, getUser, homeFor } from "../api";

function Login() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const existing = getUser();
    if (localStorage.getItem("token") && existing) {
        return <Navigate to={homeFor(existing.role)} replace />;
    }

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);

        const { ok, data } = await api("/api/auth/login", {
            method: "POST",
            body: form
        });

        setBusy(false);

        if (!ok) {
            setError(data.message || "Could not log in. Try again.");
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate(homeFor(data.user.role), { replace: true });
    };

    return (
        <AuthShell
            heading="Log in"
            sub="Use your CampusConnect account."
            footer={
                <>
                    New here? <Link to="/register">Create an account</Link>
                </>
            }
        >
            <form onSubmit={handleSubmit}>
                {error && <div className="alert alert--error" role="alert">{error}</div>}

                <div className="field">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                </div>

                <button type="submit" disabled={busy}>
                    {busy ? "Logging in..." : "Log in"}
                </button>
            </form>
        </AuthShell>
    );
}

export default Login; 