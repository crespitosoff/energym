"use client";

import { useState, useEffect } from "react";
import { supabase, Plan } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function NuevoMiembroPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    plan_id: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    const { data } = await supabase.from("plans").select("*");
    if (data) setPlans(data);
  }

  function calculateEndDate(startDate: string, days: number): string {
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const selectedPlan = plans.find((p) => p.id === form.plan_id);
    if (!selectedPlan) {
      setError("Selecciona un plan");
      setLoading(false);
      return;
    }

    const fechaVencimiento = calculateEndDate(
      form.fecha_inicio,
      selectedPlan.dias_duracion
    );

    const { error } = await supabase.from("members").insert({
      nombre: form.nombre,
      email: form.email,
      plan_id: form.plan_id,
      fecha_inicio: form.fecha_inicio,
      fecha_vencimiento: fechaVencimiento,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nuevo Miembro</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Nombre completo</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Plan</label>
          <select
            value={form.plan_id}
            onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Seleccionar plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nombre} ({plan.dias_duracion} días)
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Fecha de inicio</label>
          <input
            type="date"
            value={form.fecha_inicio}
            onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-200 text-gray-800 px-4 py-3 rounded-lg hover:bg-gray-300"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}