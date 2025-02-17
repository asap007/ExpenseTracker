import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Welcome to Expense Tracker</h1>
        <div className="space-x-4">
          <Link 
            href="/login" 
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Login
          </Link>
          <Link 
            href="/register" 
            className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  )
}