# MAL Media Build - Template Full

A production-ready Next.js 14 booking/management template with:

- **Auth**: NextAuth v5 (credentials + JWT)
- **Database**: PostgreSQL + Prisma ORM
- **UI**: Linear-style design system (OKLCH tokens, Tailwind)
- **Components**: MalButton, MalCard, MalInput, MalSelect, MalDialog
- **AuthZ**: Role-based permissions (owner/admin/manager/staff/viewer)
- **Machine Auth**: Per-tenant machine authorization
- **Figma Sync**: Code Connect + Design System Rules

## Quick Start

```bash
cp .env.example .env
# Edit DATABASE_URL, NEXTAUTH_SECRET
npm install
npx prisma migrate dev
npm run dev
```

## Scripts

- `npm run dev` - Dev server
- `npm run build` - Production build
- `npm run typecheck` - TypeScript check
- `npm run lint` - ESLint
- `npm run prisma:studio` - DB GUI
- `npm run prisma:seed` - Seed database

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── services/      # Services CRUD
│   │   ├── service-categories/
│   │   ├── admin/machines/  # Machine authorization
│   │   └── dashboard/
│   ├── dashboard/         # Dashboard pages
│   │   ├── services/      # Services management
│   │   └── settings/      # Settings with RBAC tabs
│   └── login/             # Login page
├── components/
│   ├── git-mal-lib/       # Design system components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   └── tenant-selector.tsx
│   └── ui/                # Base UI components
├── lib/
│   ├── auth.ts            # NextAuth config
│   ├── prisma.ts          # Prisma client
│   ├── services/          # Business logic services
│   │   ├── permission.ts  # Permission matrix
│   │   ├── permission-guard.ts
│   │   └── ...
│   └── validations/       # Zod schemas
├── prisma/
│   └── schema.prisma      # Database schema
├── globals.css            # OKLCH CSS variables
├── tailwind.config.js     # Tailwind with CSS var mapping
├── .figma/code-connect.json       # Figma Code Connect config
└── figma-design-system-rules.json # Design system spec
```

## Design System

Uses Linear-style OKLCH color tokens via CSS variables:
- `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`
- `--radius` for border radius scale
- Dark mode via `.dark` class

Components use semantic tokens (e.g., `bg-[var(--card)]`, `text-[var(--foreground)]`)

## Permissions

| Resource | owner | admin | manager | staff | viewer |
|----------|-------|-------|---------|-------|--------|
| machine  | CRUD  | CRUD  | R       | R     | -      |
| tenant   | CRUD  | RU    | R       | R     | R      |
| member   | CRUD  | CRUD  | CR      | R     | R      |
| booking  | CRUD  | CRUD  | CRUD    | CRD   | R      |
| service  | CRUD  | CRUD  | CRUD    | R     | R      |
| staff    | CRUD  | CRUD  | CRUD    | R     | R      |

## Machine Authorization

- Machines registered per-tenant via `POST /api/admin/machines` (owner/admin only)
- Middleware validates `x-machine-id` + `x-tenant-id` headers
- Unauthorized machines get 403

## Figma Integration

- `.figma/code-connect.json` - Maps Figma components to code
- `figma-design-system-rules.json` - Full design system spec
- Import in Figma: Plugins → Code Connect → Import config

## License

MIT