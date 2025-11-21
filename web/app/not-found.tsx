import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-4">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-indigo-500">404</h1>
        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-zinc-400 max-w-md mx-auto">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link 
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-zinc-50 text-zinc-950 font-medium hover:bg-zinc-200 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
