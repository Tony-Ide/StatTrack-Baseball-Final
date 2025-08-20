"use client"
import Layout from "@/components/Layout"

export default function HomePage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-2 text-center select-none">
          Welcome to <span className="text-gray-700">StatTrack Baseball</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl text-center mb-6">
          The modern platform for tracking, analyzing, and visualizing baseball stats. Sign in or create an account to get started.
        </p>
        <div className="flex space-x-4">
          <a href="/login" className="px-8 py-3 rounded-lg bg-gray-900 text-white font-semibold shadow hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400">Login</a>
          <a href="/register" className="px-8 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold shadow hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300">Register</a>
        </div>
      </div>
    </Layout>
  )
}
