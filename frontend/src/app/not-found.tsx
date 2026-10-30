import Link from "next/link";
export default function NotFound() {
  return (
    <main className="content">
      <h1>Page not found</h1>
      <p>This page doesn’t exist.</p>
      <Link href="/dashboard">Return to your dashboard</Link>
    </main>
  );
}
