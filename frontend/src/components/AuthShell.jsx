import IssueTicket from "./IssueTicket";

// Illustration only: shows what a tracked issue looks like
const SAMPLE = {
    _id: "0000000000000a7c2",
    title: "Ceiling fan sparking in Lab 3",
    location: "Lab 3, Block A",
    category: "Maintenance",
    priority: "Urgent",
    status: "In Progress",
    assignedTo: "sample",
    aiSource: "ai",
    aiSummary: "Fan in Lab 3 is sparking and may be an electrical hazard.",
    createdAt: new Date().toISOString()
};

function AuthShell({ heading, sub, children, footer }) {
    return (
        <div className="auth">
            <section className="auth__panel" aria-hidden="true">
                <div className="brand brand--big">
                    CampusConnect<span className="brand__ai">AI</span>
                </div>

                <div>
                    <p className="auth__pitch">
                        Report a problem on campus. Watch it get fixed.
                    </p>
                    <div className="auth__sample">
                        <IssueTicket issue={SAMPLE} />
                        <p className="auth__caption">Example ticket</p>
                    </div>
                </div>
            </section>

            <section className="auth__form">
                <div className="auth__box">
                    <div className="brand brand--dark auth__mobilebrand">
                        CampusConnect<span className="brand__ai">AI</span>
                    </div>
                    <h1>{heading}</h1>
                    <p className="muted">{sub}</p>
                    {children}
                    <p className="auth__footer">{footer}</p>
                </div>
            </section>
        </div>
    );
}

export default AuthShell; 