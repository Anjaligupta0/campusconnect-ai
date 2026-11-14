import { API_URL } from "./config";

export const getUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
};

export const homeFor = (role) =>
    role === "admin"
        ? "/admin-dashboard"
        : role === "staff"
        ? "/staff-dashboard"
        : "/dashboard";

export const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
};

// Full URL for an uploaded image such as "/uploads/123.png"
export const assetUrl = (path) =>
    !path ? "" : path.startsWith("http") ? path : `${API_URL}${path}`;

export const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric"
          })
        : "";

export const formatDateTime = (value) =>
    value
        ? new Date(value).toLocaleString(undefined, {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit"
          })
        : "";

/**
 * One place for every backend call.
 *   api("/api/issues/my")
 *   api("/api/auth/login", { method: "POST", body: { email, password } })
 *   api("/api/issues", { method: "POST", form: formData })
 * Always resolves to { ok, status, data } and never throws.
 */
export async function api(path, { method = "GET", body, form } = {}) {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    let payload;
    if (form) {
        payload = form;
    } else if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${path}`, {
            method,
            headers,
            body: payload
        });

        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        // Token expired or invalid: send the user back to log in
        if (response.status === 401 && token) {
            logout();
        }

        return { ok: response.ok, status: response.status, data };
    } catch {
        return {
            ok: false,
            status: 0,
            data: {
                message:
                    "Can't reach the server. Check your connection and try again."
            }
        };
    }
} 