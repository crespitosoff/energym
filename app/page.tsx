export default function Home() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">
        Bienvenido a Energym
      </h1>
      <p className="text-gray-600 mb-8">
        Sistema de gestión para gimnasios
      </p>
      <div className="space-x-4">
        <a
          href="/login"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-block"
        >
          Iniciar Sesión
        </a>
        <a
          href="/dashboard"
          className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 inline-block"
        >
          Dashboard
        </a>
      </div>
    </div>
  );
}