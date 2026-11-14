import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import StaffDashboard from "./pages/StaffDashboard";
import Register from "./pages/Register";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import ReportIssue from "./pages/ReportIssue";
import MyIssues from "./pages/MyIssues";
import AdminDashboard from "./pages/AdminDashboard";
import Notifications from "./pages/Notifications";
import AIAssistant from "./pages/AIAssistant";
import TrackIssue from "./pages/TrackIssue";

const STUDENT = ["student"];
const STAFF = ["staff", "admin"];
const ANY = ["student", "staff", "admin"];

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Student */}
                <Route path="/dashboard" element={
                    <ProtectedRoute roles={STUDENT}><StudentDashboard /></ProtectedRoute>
                } />
                <Route path="/report-issue" element={
                    <ProtectedRoute roles={STUDENT}><ReportIssue /></ProtectedRoute>
                } />
                <Route path="/my-issues" element={
                    <ProtectedRoute roles={STUDENT}><MyIssues /></ProtectedRoute>
                } />
                <Route path="/track-issue" element={
                    <ProtectedRoute roles={STUDENT}><TrackIssue /></ProtectedRoute>
                } />

                {/* Staff (admins may also open it) */}
                <Route path="/staff-dashboard" element={
                    <ProtectedRoute roles={STAFF}><StaffDashboard /></ProtectedRoute>
                } />

                {/* Admin only */}
                <Route path="/admin-dashboard" element={
                    <ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>
                } />

                {/* Any logged-in user */}
                <Route path="/notifications" element={
                    <ProtectedRoute roles={ANY}><Notifications /></ProtectedRoute>
                } />
                <Route path="/ai-assistant" element={
                    <ProtectedRoute roles={ANY}><AIAssistant /></ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}

export default App; 