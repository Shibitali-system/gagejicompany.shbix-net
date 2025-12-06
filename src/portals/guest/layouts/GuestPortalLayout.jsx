export default function GuestPortalLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">StayEasy</h1>
          <nav className="space-x-6">
            <a href="/portals/guest/rooms" className="text-gray-700 hover:text-blue-600">Rooms</a>
            <a href="/portals/guest/my-bookings" className="text-gray-700 hover:text-blue-600">My Bookings</a>
            <a href="/portals/guest/login" className="text-blue-600 font-semibold">Login</a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-white shadow mt-10">
        <div className="max-w-7xl mx-auto p-4 text-center text-gray-600 text-sm">
          © {new Date().getFullYear()} StayEasy Guest System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
