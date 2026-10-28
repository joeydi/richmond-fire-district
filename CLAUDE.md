# CLAUDE.md - Richmond Fire District Water System

This document provides guidance for AI assistants working with this codebase.

## Project Overview

Richmond Fire District is a full-stack water system management application for tracking water infrastructure, meter readings, chlorine levels, reservoir data, and maintenance activities. It serves fire district personnel with role-based access control.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type-safe JavaScript |
| Supabase | 2.90.1 | PostgreSQL database, auth, storage |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | - | Radix UI components (New York style) |
| MapboxGL | 3.17.0 | Interactive mapping |
| React Hook Form | 7.70.0 | Form state management |
| Zod | 4.3.5 | Schema validation |
| Lucide React | - | Icon library |
| Sonner | 2.0.7 | Toast notifications |

## Development Commands

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Directory Structure

```
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, callback)
│   ├── (dashboard)/              # Protected dashboard routes
│   │   └── dashboard/
│   │       ├── page.tsx          # Main dashboard with stats
│   │       ├── readings/         # Meter, chlorine, reservoir data
│   │       ├── map/              # Infrastructure map
│   │       ├── contacts/         # Contact directory
│   │       ├── infrastructure/   # Infrastructure management
│   │       ├── log/              # Activity logs
│   │       ├── reports/          # Report generation
│   │       └── admin/            # Admin user management
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Tailwind + theme variables
│
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # Header, sidebar, shell
│   ├── dashboard/                # Stats, charts, cards
│   ├── map/                      # MapboxGL components
│   ├── readings/                 # Reading forms and tables
│   ├── log/                      # Log post components
│   ├── contacts/                 # Contact table/forms
│   └── infrastructure/           # Infrastructure components
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server-side client (SSR)
│   ├── auth/
│   │   └── roles.ts              # Role-based access helpers
│   ├── actions/                  # Server Actions (CRUD operations)
│   │   ├── readings.ts           # Meter/chlorine/reservoir
│   │   ├── infrastructure.ts     # Infrastructure CRUD
│   │   ├── contacts.ts           # Contact CRUD
│   │   ├── dashboard.ts          # Dashboard stats
│   │   ├── log.ts                # Log posts
│   │   ├── map.ts                # Parcel queries
│   │   ├── users.ts              # User management
│   │   └── readings-import.ts    # CSV import
│   ├── types/
│   │   ├── database.ts           # Core TypeScript interfaces
│   │   ├── infrastructure.ts     # Infrastructure types/constants
│   │   └── log.ts                # Log post types
│   └── utils.ts                  # cn() utility (clsx + tailwind-merge)
│
├── hooks/
│   └── use-camera.ts             # Camera capture hook
│
├── supabase/
│   └── migrations/               # SQL migrations (numbered)
│
├── scripts/                      # Utility scripts
└── public/                       # Static assets
```

## Key Patterns and Conventions

### Server Components (Default)
Components are server components by default. Add `"use client"` only for:
- Interactive forms with state
- Client-side hooks (useState, useEffect)
- Event handlers (onClick, onChange)
- MapboxGL components

### Server Actions Pattern
All data mutations use Server Actions in `/lib/actions/`:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { requireEditor } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  field: z.string(),
});

export async function insertData(input: Input): Promise<{ success: boolean; error?: string }> {
  const user = await requireEditor();  // Auth check

  const parsed = schema.safeParse(input);  // Validate
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("table").insert({...});

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");  // Invalidate cache
  return { success: true };
}
```

### Form Pattern
Forms use React Hook Form with Zod validation:

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";

export function MyForm() {
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {...},
  });

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = await serverAction(data);
      if (result.success) {
        toast.success("Saved");
      } else {
        toast.error(result.error);
      }
    });
  }

  return <Form onSubmit={form.handleSubmit(onSubmit)}>...</Form>;
}
```

### Role-Based Access
Three user roles with hierarchical permissions:

| Role | Permissions |
|------|-------------|
| `admin` | Full access, user management |
| `editor` | Create, read, update, delete data |
| `member` | Read-only access |

Auth helpers in `lib/auth/roles.ts`:
- `requireAuth()` - Any authenticated user
- `requireEditor()` - Editor or admin required
- `requireAdmin()` - Admin only
- `isAdmin()`, `canEdit()` - Boolean checks

### Component Styling
Use Tailwind CSS with the `cn()` utility for conditional classes:

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  condition && "conditional-classes"
)} />
```

### Path Aliases
Use `@/` for imports from project root:
```typescript
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
```

## Database Schema

### Core Tables
- `profiles` - Users with roles (admin/editor/member)
- `meters` - Water meter reference data
- `reservoirs` - Reservoir reference data
- `meter_readings` - Time-series meter readings with `production_rate`
- `chlorine_readings` - Chlorine residual measurements
- `reservoir_readings` - Reservoir level data
- `infrastructure_points` - Map infrastructure (hydrants, valves, wells)
- `infrastructure_images` - Images for infrastructure points
- `contacts` - Contact directory
- `parcels` - Property boundaries (PostGIS geometry)
- `log_posts` - Activity logs with rich text
- `log_post_images` - Images for log posts

### PostGIS in `public`

**PostGIS lives in the `extensions` schema, not `public`.** Migration 003
originally installed it into `public`, which exposed `spatial_ref_sys` (the EPSG
catalog) through PostgREST and tripped the "RLS Disabled in Public" advisor.
Migration 015 tried to enable RLS / revoke grants on that table and was refused —
it is owned by `supabase_admin`, not `postgres`. Migration 016 relocated the
extension instead, which removed it from the API surface entirely.

What this means for new code:

- **`parcels.geometry` is typed `extensions.geometry(MultiPolygon, 4326)`.**
- **Any `SECURITY DEFINER` function using `ST_*` must declare
  `SET search_path = public, extensions`.** `SECURITY DEFINER` does not set
  search_path on its own, and `anon`/`authenticated` have no search_path
  setting — they fall back to `"$user", public` and will not find PostGIS.
  `get_parcels_in_viewport` and `get_parcel_by_id` both do this.
- Ad-hoc SQL run as `postgres` works unqualified (its search_path includes
  `extensions`); elsewhere, schema-qualify as `extensions.ST_Intersects(...)`.
- PostGIS is non-relocatable, so 016 had to `DROP EXTENSION postgis CASCADE`
  (which cascades to `parcels.geometry`) and recreate it. Geometries were staged
  in-database as EWKB and restored — no VCGI re-import was needed. If this ever
  has to be redone, stage as EWKB rather than GeoJSON: `ST_AsGeoJSON` rounds to
  9 decimal places, EWKB is lossless.
- Inserting parcels still works by passing GeoJSON text: there is a
  `text → geometry` cast and `geometry_in` parses GeoJSON, yielding SRID 4326.
  This is how `scripts/import-parcels.ts` writes through PostgREST.
- 5 parcels have self-intersecting polygons and fail `ST_IsValid`. This is
  pre-existing VCGI source data, not migration damage.

### Enums
```sql
user_role: admin | editor | member
infrastructure_type: shutoff_valve | hydrant | well | meter | reservoir | other
infrastructure_status: active | inactive | maintenance | unknown
```

### Key Relationships
- `meter_readings.meter_id` → `meters.id`
- `reservoir_readings.reservoir_id` → `reservoirs.id`
- `chlorine_readings.location_id` → `infrastructure_points.id`
- `*.created_by` → `profiles.id`

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
```

Optional for faster session checks (public keys from
`{NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`; lets cold server
instances verify sessions without fetching them, see `lib/supabase/jwks.ts`):
```
SUPABASE_JWKS={"keys":[...]}
```

Optional for reading meter photos (`lib/services/meter-ocr.ts`, Claude Haiku;
without it the daily round says the photo couldn't be read):
```
ANTHROPIC_API_KEY=
```

Optional for email notifications:
```
# SendGrid. The from address must be on a domain authenticated in SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=notifications@your-domain.org
SENDGRID_FROM_NAME=Richmond Fire District

# Vercel Cron authentication (set in Vercel dashboard)
CRON_SECRET=your-vercel-cron-secret
```

## Notifications

- `lib/services/notifications.ts` decides who gets what and builds the data;
  `lib/services/email.ts` renders a template and sends it through SendGrid.
- It runs from cron jobs and `after()` callbacks with no user session and reads
  every user's preferences, so it **must use `createAdminClient()`**. With the
  cookie client, RLS hides every row but the caller's own.
- Templates are React Email components in `emails/` (`npm run email` previews
  them). Each exports `PreviewProps` with sample data. Format dates with the
  helpers in `emails/_components/format.ts`, which pin them to America/New_York.
- New log post emails go out from `createLogPost` through `after()`. They skip
  the author.
- Missing reading alerts send once per gap: `last_*_alert_at` records the send,
  and the next alert waits for a newer reading. Interpolated readings don't
  count as readings.
- SMS (`lib/services/sms.ts`, the `*_sms` and `phone_number` columns) is not
  wired up and is hidden in the UI until Twilio's US carrier registration is done.

## Vercel Cron Jobs

Cron jobs are configured in `vercel.json` and run automatically on Vercel:

| Schedule | Endpoint | Description |
|----------|----------|-------------|
| Daily 12:00 UTC | `/api/cron/daily` | Missing reading alerts + daily digests |
| Monday 12:00 UTC | `/api/cron/weekly` | Weekly digests |

Both require `Authorization: Bearer {CRON_SECRET}` (checked by
`lib/auth/cron.ts`); send that header to trigger one by hand.

## Adding New Features

### New Server Action
1. Create or update file in `lib/actions/`
2. Add `"use server"` directive at top
3. Define Zod schema for validation
4. Use `requireEditor()` or `requireAdmin()` for auth
5. Call `revalidatePath()` after mutations

### New Component
1. Create in appropriate `components/` subdirectory
2. Default to server component
3. Add `"use client"` only if needed for interactivity
4. Use shadcn/ui primitives from `components/ui/`

### New Page
1. Create `page.tsx` in `app/(dashboard)/dashboard/[route]/`
2. Use async server component for data fetching
3. Wrap async content in Suspense with skeleton loader

### New Database Table
1. Create migration in `supabase/migrations/` with next number
2. Add RLS policies for role-based access
3. Add TypeScript interface in `lib/types/database.ts`

## Code Quality

- TypeScript strict mode enabled
- ESLint with Next.js core web vitals rules
- Use `cn()` for conditional Tailwind classes
- Return `{ success, error }` tuples from server actions
- Use toast notifications for user feedback

## Common Files to Reference

- `lib/auth/roles.ts` - Auth and role helpers
- `lib/supabase/server.ts` - Server-side Supabase client
- `lib/types/database.ts` - Core TypeScript interfaces
- `components/ui/*` - shadcn/ui components
- `app/globals.css` - Theme variables and global styles
