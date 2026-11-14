import { Navigate } from "react-router-dom";

const homeFor = (role) =>
    role === "admin"
        ? "/admin-dashboard"
        : role === "staff"
        ? "/staff-dashboard"
        : "/dashboard";

const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
};

// <ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>
// - not logged in         -> /login
// - logged in, wrong role -> that user's own dashboard
function ProtectedRoute({ roles, children }) {
    const token = localStorage.getItem("token");
    const user = readUser();

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(user.role)) {
        return <Navigate to={homeFor(user.role)} replace />;
    }

    return children;
}

export default ProtectedRoute; 