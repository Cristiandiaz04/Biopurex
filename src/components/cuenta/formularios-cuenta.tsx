"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cambiarContrasena, guardarDatos, type ResultadoForm } from "@/app/cuenta/acciones";
import { Campo, MensajeError } from "@/components/ui/campo";
import type { Perfil } from "@/lib/datos/cuenta";
import { formatoTelefono } from "@/lib/validacion";

const tarjeta = "flex max-w-[560px] flex-col gap-4 rounded-lg bg-bg p-[clamp(18px,3vw,28px)] shadow-1";
const boton = "h-12 self-start rounded-full bg-navy px-6 font-semibold text-white hover:bg-navy-700 disabled:opacity-60";

function Ok({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <div role="status" className="flex items-center gap-2 rounded-md bg-success-50 px-3.5 py-3 text-sm font-medium text-success">
      <CheckCircle2 size={16} aria-hidden />
      {texto}
    </div>
  );
}

export function FormularioDatos({ perfil, rtn }: { perfil: Perfil; rtn: string | null }) {
  const [est, accion, pendiente] = useActionState(guardarDatos, {} as ResultadoForm);
  return (
    <form action={accion} noValidate className={tarjeta}>
      <h2 className="m-0 text-xl font-bold">Datos personales</h2>
      <Campo label="Nombre completo" name="nombre" defaultValue={perfil.nombre} autoComplete="name" error={est.errores?.nombre} />
      <Campo label="Correo electrónico" name="correo" defaultValue={perfil.correo} disabled />
      <Campo
        label="Teléfono"
        name="telefono"
        type="tel"
        inputMode="numeric"
        defaultValue={perfil.telefono ? formatoTelefono(perfil.telefono) : ""}
        placeholder="9876-5432"
        error={est.errores?.telefono}
      />
      <Campo label="RTN (para tu factura)" name="rtn" inputMode="numeric" opcional defaultValue={rtn ?? ""} placeholder="14 dígitos" error={est.errores?.rtn} />
      {est.error && <MensajeError>{est.error}</MensajeError>}
      <Ok texto={est.ok} />
      <button type="submit" disabled={pendiente} className={boton}>
        {pendiente ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

export function FormularioContrasena() {
  const [est, accion, pendiente] = useActionState(cambiarContrasena, {} as ResultadoForm);
  return (
    <form action={accion} noValidate className={tarjeta}>
      <h2 className="m-0 text-xl font-bold">Cambiar contraseña</h2>
      <Campo label="Contraseña nueva" name="contrasena" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" error={est.errores?.contrasena} />
      <Campo label="Repite la contraseña" name="confirmar" type="password" autoComplete="new-password" error={est.errores?.confirmar} />
      {est.error && <MensajeError>{est.error}</MensajeError>}
      <Ok texto={est.ok} />
      <button type="submit" disabled={pendiente} className={boton}>
        {pendiente ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
