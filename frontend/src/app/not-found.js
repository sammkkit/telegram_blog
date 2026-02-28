import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>This page doesn't exist.</p>
      <Link href="/" className="back-link" style={{ marginTop: "1.5rem" }}>
        ← Go back home
      </Link>
    </div>
  );
}
