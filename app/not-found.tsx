import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center bg-navy text-cream px-4">
      <div className="w-full max-w-[400px] bg-navy-100 border border-navy-400 rounded-xl shadow-pop p-6 text-center">
        <div className="font-oswald font-medium tracking-wide text-sage text-sm">MERGEIT</div>
        <div className="text-[9.5px] uppercase tracking-[0.18em] text-navy-600 font-mono mb-4">CLIENT PORTAL</div>
        <h1 className="text-xl font-semibold text-cream">Page not found</h1>
        <p className="text-navy-600 text-sm mt-2">The page you were looking for is not part of the portal.</p>
        <Link href="/" className="inline-flex items-center justify-center h-9 px-3 mt-4 rounded-md text-sm font-medium bg-emerald-400 text-[#0A2947] hover:brightness-110">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
