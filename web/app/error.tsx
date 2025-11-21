'use client' // Error components must be Client Components
 
import { useEffect } from 'react'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-50 p-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-red-500">Something went wrong!</h1>
        <p className="text-zinc-400 max-w-md mx-auto">
          An unexpected error has occurred. We apologize for the inconvenience.
        </p>
        <button
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-zinc-50 text-zinc-950 font-medium hover:bg-zinc-200 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
