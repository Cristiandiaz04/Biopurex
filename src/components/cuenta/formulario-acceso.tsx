"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { iniciarSesion, registrarse, type EstadoAcceso } from "@/app/ingresar/acciones";
import { Campo, MensajeError } from "@/components/ui/campo";

const INICIAL: EstadoAcceso = {};

export function FormularioAcceso() {
  const sp = useSearchParams();
  const siguiente = sp.get("siguiente") ?? "/cuenta";
  const [modo, setModo] = useState<"login" | "registro">(sp.get("modo") === "registro" ? "registro" : "login");
  const [estLogin, accionLogin, cargandoLogin] = useActionState(iniciarSesion, INICIAL);
  const [estReg, accionReg, cargandoReg] = useActionState(registrarse, INICIAL);
  const reg = modo === "registro";
  const est = reg ? estReg : estLogin;
  const cargando = reg ? cargandoReg : cargandoLogin;

  const pestana = (activa: boolean) =>
    `h-11 rounded-full text-center text-sm font-semibold ${activa ? "bg-bg shadow-1" : ""}`;

  return (
    <div className="flex w-full max-w-[440px] flex-col gap-5 self-start rounded-xl bg-bg p-[clamp(24px,4vw,40px)] shadow-2">
      <Image src="/img/logo.png" alt="BIOPUREX" width={104} height={52} className="h-[52px] w-auto self-center" />
      <div role="tablist" className="grid grid-cols-2 rounded-full bg-surface p-1">
        <button type="button" role="tab" aria-selected={!reg} onClick={() => setModo("login")} className={pestana(!reg)}>
          Iniciar sesión
        </button>
        <button type="button" role="tab" aria-selected={reg} onClick={() => setModo("registro")} className={pestana(reg)}>
          Crear cuenta
        </button>
      </div>
      <h1 className="font-display m-0 text-[clamp(28px,3vw,34px)] leading-none">{reg ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h1>

      {est.ok ? (
        <div role="status" className="flex gap-3 rounded-md bg-success-50 p-4 text-sm leading-normal text-success">
          <CheckCircle2 size={20} className="flex-none" aria-hidden />
          {est.ok}
        </div>
      ) : (
        <form key={modo} action={reg ? accionReg : accionLogin} noValidate className="flex flex-col gap-5">
          <input type="hidden" name="siguiente" value={siguiente} />
          {reg && (
            <Campo label="Nombre completo" name="nombre" autoComplete="name" placeholder="José Luis Bonilla" defaultValue={est.valores?.nombre} error={est.errores?.nombre} />
          )}
          <Campo
            label="Correo electrónico"
            name="correo"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nombre@correo.com"
            defaultValue={est.valores?.correo}
            error={est.errores?.correo}
          />
          <Campo
            label="Contraseña"
            name="contrasena"
            type="password"
            autoComplete={reg ? "new-password" : "current-password"}
            placeholder={reg ? "Mínimo 8 caracteres" : "Tu contraseña"}
            error={est.errores?.contrasena}
          />
          {!reg && (
            <Link href="/recuperar" className="-mt-2 self-start py-2 text-sm font-semibold">
              ¿Olvidaste tu contraseña?
            </Link>
          )}
          {est.mensaje && <MensajeError>{est.mensaje}</MensajeError>}
          <button
            type="submit"
            disabled={cargando}
            className="h-[52px] rounded-full bg-navy text-center font-semibold text-white hover:bg-navy-700 disabled:opacity-60"
          >
            {cargando ? "Un momento…" : reg ? "Crear cuenta" : "Iniciar sesión"}
          </button>
        </form>
      )}
    </div>
  );
}
