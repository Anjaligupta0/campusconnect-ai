import { Navigate } from "react-router-dom";

// Tracking now lives inside "My issues" (each issue has a history timeline).
function TrackIssue() {
    return <Navigate to="/my-issues" replace />;
}

export default TrackIssue; 