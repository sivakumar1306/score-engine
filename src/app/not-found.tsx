import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <div className="font-display text-7xl font-bold text-gradient">404</div>
      <p className="mt-3 text-muted">This track doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 inline-block text-hot hover:underline">Back to the leaderboard</Link>
    </div>
  );
}
