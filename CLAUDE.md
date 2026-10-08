@AGENTS.md

# Biopurex — contexto

Proyecto de Cristian. **La documentación y el contexto viven en el vault Obsidian**, no aquí:
`C:\Claude\Claude-Cerebro\Proyectos\Biopurex\`

- Overview, problema y estado → `Biopurex — Overview.md`
- Diseño (prompts, export de Claude Design, decisiones) → `Biopurex — Diseño.md` · Catálogo → `Biopurex — Catálogo.md`
- Design System → `Proyectos\Designe-System-Proyectos\Designe-System-Biopurex\`
- Funcionalidades → `Biopurex — Funcionalidades.md`
- Decisiones técnicas/diseño → `Biopurex — Decisiones.md`
- Registro de sesiones → `Biopurex — Diario.md`

Reglas globales: `C:\Users\User\.claude\CLAUDE.md`.

## Stack
Next.js 16 (App Router, Cache Components) + TypeScript · Tailwind CSS v4 (tokens en `src/app/globals.css`) ·
lucide-react · Supabase (fase 2) · Vercel.

## Cómo trabajar
- Al empezar sesión: leer las notas del proyecto en el vault.
- Diseño fuente: export de Claude Design en `Proyectos\Biopurex\diseno\export-2026-10-08\` del vault. Traducir fiel, no rediseñar.
- Colores solo desde variables de `globals.css`. El color del aroma nunca es texto ni botón.
- Ir por partes; migraciones de BD en `supabase/migrations/`, las corre Cristian a mano.
- Commits a `staging`; producción solo cuando Cristian lo pida.
- Al terminar una sesión con avances: actualizar Overview (estado) y Diario del proyecto en el vault.
