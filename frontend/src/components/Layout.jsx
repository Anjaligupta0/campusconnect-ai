import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api, getUser, logout } from "../api";

const NAV = {
    student: [
        ["/dashboard", "Overview"],
        ["/report-issue", "Report an issue"],
        ["/my-issues", "My issues"],
    
        ["/ai-assistant", "Campus assistant"],
        ["/notifications", "Notifications"]
    ],
    staff: [
        ["/staff-dashboard", "Work queue"],
        ["/ai-assistant", "Campus assistant"],
        ["/notifications", "Notifications"]
    ],
    admin: [
        ["/admin-dashboard", "Admin overview"],
        ["/staff-dashboard", "Work queue"],
        ["/ai-assistant", "Campus assistant"],
        ["/notifications", "Notifications"]
    ]
};

const roleLabel = { student: "Student", staff: "Staff", admin: "Administrator" };

function Layout({ title, subtitle, actions, children }) {
    const user = getUser();
    const links = NAV[user?.role] || NAV.student;
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        let active = true;

        const loadUnread = async () => {
            const { ok, data } = await api("/api/notifications");
            if (active && ok) {
                setUnread(
                    (data.notifications || []).filter((n) => !n.isRead).length
                );
            }
        };

        loadUnread();
        window.addEventListener("focus", loadUnread);
        return () => {
            active = false;
            window.removeEventListener("focus", loadUnread);
        };
    }, []);

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="brand">
                    CampusConnect<span className="brand__ai">AI</span>
                </div>

                <nav className="nav" aria-label="Main">
                    {links.map(([to, label]) => (
                        <NavLink
                            key={to + label}
                            to={to}
                            className={({ isActive }) =>
                                isActive ? "nav__link is-active" : "nav__link"
                            }
                        >
                            {label}
                            {to === "/notifications" && unread > 0 && (
                                <span className="nav__count">{unread}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar__user">
                    <div>
                        <strong>{user?.name}</strong>
                        <span>{roleLabel[user?.role] || "Student"}</span>
                    </div>
                    <button className="btn btn--quiet" onClick={logout}>
                        Log out
                    </button>
                </div>
            </aside>

            <main className="main">
                <header className="page-head">
                    <div>
                        <h1>{title}</h1>
                        {subtitle && <p className="page-head__sub">{subtitle}</p>}
                    </div>
                    {actions && <div className="page-head__actions">{actions}</div>}
                </header>

                {children}
            </main>
        </div>
    );
} 

export default Layout; 