import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Energym - Gestión de Gimnasio",
  description: "Sistema de gestión para gimnasios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-100 min-h-screen">
        <nav className="bg-blue-600 text-white p-4 shadow-md">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <a href="/" className="text-xl font-bold">Energym</a>
            <div className="space-x-4">
              <a href="/dashboard" className="hover:underline">Dashboard</a>
              <a href="/login" className="hover:underline">Login</a>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  );
}