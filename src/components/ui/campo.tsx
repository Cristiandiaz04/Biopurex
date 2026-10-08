import { AlertTriangle } from "lucide-react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; opcional?: boolean };

const base =
  "h-12 rounded-md border-[1.5px] bg-bg px-4 text-base text-navy outline-none transition-[border-color,box-shadow] focus:border-navy focus:shadow-[0_0_0_3px_var(--navy-50)]";

/** Campo de formulario del sistema de diseño (label arriba, error abajo). */
export function Campo({ label, error, opcional, className = "", id, name, ...rest }: Props) {
  const idCampo = id ?? `campo-${name}`;
  return (
    <label htmlFor={idCampo} className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-semibold">
        {label}
        {opcional && " (opcional)"}
      </span>
      <input
        id={idCampo}
        name={name}
        aria-invalid={!!error}
        aria-describedby={error ? `${idCampo}-error` : undefined}
        className={`${base} ${error ? "border-error" : "border-line"}`}
        {...rest}
      />
      {error && (
        <span id={`${idCampo}-error`} className="flex items-center gap-1.5 text-[13px] font-medium text-error">
          <AlertTriangle size={16} strokeWidth={2.25} aria-hidden />
          {error}
        </span>
      )}
    </label>
  );
}

export function Selector({
  label,
  error,
  className = "",
  id,
  name,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  const idCampo = id ?? `campo-${name}`;
  return (
    <label htmlFor={idCampo} className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-semibold">{label}</span>
      <select
        id={idCampo}
        name={name}
        aria-invalid={!!error}
        className={`${base} cursor-pointer ${error ? "border-error" : "border-line"}`}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="text-[13px] font-medium text-error">{error}</span>}
    </label>
  );
}

export function MensajeError({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="flex items-center gap-2 rounded-md bg-error-50 px-3.5 py-3 text-sm font-medium text-error">
      <AlertTriangle size={16} strokeWidth={2.25} className="flex-none" aria-hidden />
      {children}
    </div>
  );
}
