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

Optional for notifications (email/SMS):
```
# SendGrid (email notifications)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@example.com
SENDGRID_FROM_NAME=Richmond Fire District

# Twilio (SMS notifications)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+1234567890

# API authentication for cron jobs
NOTIFICATION_API_SECRET=your-secret-key
```

## Notification API Endpoints

The following API endpoints can be called by cron jobs or webhooks:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/log-post` | POST | Notify users of new log posts (called automatically) |
| `/api/notifications/check-readings` | POST | Check for missing readings and alert users |
| `/api/notifications/digest?frequency=daily` | POST | Send daily digest emails |
| `/api/notifications/digest?frequency=weekly` | POST | Send weekly digest emails |

All endpoints require `Authorization: Bearer {NOTIFICATION_API_SECRET}` header.

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
