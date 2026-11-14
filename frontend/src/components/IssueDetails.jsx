import ActivityTimeline from "./ActivityTimeline";
import Comments from "./Comments";
import { assetUrl } from "../api";

function IssueDetails({ issue }) {
    return (
        <div className="details">
            {issue.resolutionNote && (
                <div className="note note--ok">
                    <strong>How it was resolved</strong>
                    <p>{issue.resolutionNote}</p>
                </div>
            )}

            <section>
                <h4>Description</h4>
                <p>{issue.description}</p>
            </section>

            {issue.imageUrl && (
                <section>
                    <h4>Photo</h4>
                    <img
                        className="photo"
                        src={assetUrl(issue.imageUrl)}
                        alt={`Photo attached to: ${issue.title}`}
                    />
                </section>
            )}

            <section>
                <h4>History</h4>
                <ActivityTimeline issueId={issue._id} />
            </section>

            <section>
                <h4>Comments</h4>
                <Comments issueId={issue._id} />
            </section>
        </div>
    );
}

export default IssueDetails; 