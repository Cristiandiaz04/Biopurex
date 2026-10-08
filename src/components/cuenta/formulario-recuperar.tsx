"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { recuperarContrasena, type EstadoAcceso } from "@/acciones/acceso";
import { Campo } from "@/components/ui/campo";

export function FormularioRecuperar() {
  const [est, accion, cargando] = useActionState(recuperarContrasena, {} as EstadoAcceso);
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-5 self-start rounded-xl bg-bg p-[clamp(24px,4vw,40px)] shadow-2">
      <h1 className="font-display m-0 text-[clamp(28px,3vw,34px)] leading-none">Recupera tu contraseña</h1>
      {est.ok ? (
        <div role="status" className="flex gap-3 rounded-md bg-success-50 p-4 text-sm leading-normal text-success">
          <CheckCircle2 size={20} className="flex-none" aria-hidden />
          {est.ok}
        </div>
      ) : (
        <form action={accion} noValidate className="flex flex-col gap-5">
          <p className="m-0 text-text-2">Escribe el correo de tu cuenta y te enviamos un enlace para crear una contraseña nueva.</p>
          <Campo label="Correo electrónico" name="correo" type="email" autoComplete="email" defaultValue={est.valores?.correo} error={est.errores?.correo} />
          <button type="submit" disabled={cargando} className="h-[52px] rounded-full bg-navy font-semibold text-white hover:bg-navy-700 disabled:opacity-60">
            {cargando ? "Enviando…" : "Enviar enlace"}
          </button>
        </form>
      )}
      <Link href="/ingresar" className="self-start text-sm font-semibold">Volver a iniciar sesión</Link>
    </div>
  );
}
