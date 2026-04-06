"use client";

import { useEffect, useState } from "react";
import { supabase, Member } from "@/lib/supabase";
import Link from "next/link";

export default function DashboardPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    const { data, error } = await supabase
      .from("members")
      .select(`
        id,
        nombre,
        email,
        plan_id,
        plans ( nombre ),
        fecha_inicio,
        fecha_vencimiento
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMembers(
        data.map((m: any) => ({
          ...m,
          plan_nombre: m.plans?.nombre,
        }))
      );
    }
    setLoading(false);
  }

  function isExpired(fechaVencimiento: string): boolean {
    return new Date(fechaVencimiento) < new Date();
  }

  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Miembros</h1>
        <Link
          href="/miembros/nuevo"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nuevo Miembro
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-10">Cargando...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No hay miembros registrados.{" "}
          <Link href="/miembros/nuevo" className="text-blue-600 hover:underline">
            Agregar el primero
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Plan</th>
                <th className="p-3 text-left">Vencimiento</th>
                <th className="p-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t">
                  <td className="p-3">{member.nombre}</td>
                  <td className="p-3">{member.email}</td>
                  <td className="p-3">{member.plan_nombre || "-"}</td>
                  <td className="p-3">{formatDate(member.fecha_vencimiento)}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        isExpired(member.fecha_vencimiento)
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {isExpired(member.fecha_vencimiento) ? "Vencido" : "Activo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}