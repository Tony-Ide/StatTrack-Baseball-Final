import type { ReactNode } from "react"
import { useRouter } from "next/router"

interface LayoutProps {
  children: ReactNode
  showLogout?: boolean
  fullBleed?: boolean
}

export default function Layout({ children, showLogout, fullBleed }: LayoutProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" })
    // Clear the cache from localStorage on logout
    localStorage.removeItem('cachedUserGames')
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex justify-between items-center py-5">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 select-none">StatTrack Baseball</h1>
            {showLogout && (
              <button
                onClick={handleLogout}
                className="px-5 py-2 rounded-lg bg-gray-900 text-white font-semibold shadow hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      </header>
      <main className={fullBleed ? "p-0 m-0 w-full h-full" : "max-w-4xl mx-auto py-10 px-4 sm:px-8"}>
        {fullBleed ? (
          children
        ) : (
          <div className="rounded-2xl bg-white/90 shadow-lg p-8 border border-gray-100">
            {children}
          </div>
        )}
      </main>
    </div>
  )
}
