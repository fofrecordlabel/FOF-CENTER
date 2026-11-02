import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <h1>Nothing on file</h1>
      <p>That record is not on the desk.</p>
      <Link className="btn primary" href="/">
        Back to the desk
      </Link>
    </div>
  );
}
