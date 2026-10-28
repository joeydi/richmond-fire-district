# Richmond Fire District Water System

A full-stack water system management application for tracking water infrastructure, meter readings, chlorine levels, reservoir data, and maintenance activities. Built for fire district personnel with role-based access control.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js](https://nextjs.org) 16 | React framework with App Router |
| [React](https://react.dev) 19 | UI library |
| [TypeScript](https://www.typescriptlang.org) | Type-safe JavaScript |
| [Supabase](https://supabase.com) | PostgreSQL + PostGIS database, auth, storage |
| [Tailwind CSS](https://tailwindcss.com) 4 | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com) | Radix UI components |
| [Mapbox GL JS](https://www.mapbox.com/mapbox-gljs) | Interactive mapping |
| [React Hook Form](https://react-hook-form.com) | Form state management |
| [Zod](https://zod.dev) | Schema validation |

## Features

- **Dashboard** - Overview stats, charts, and recent activity
- **Readings** - Meter readings with production rates, chlorine residuals, and reservoir levels, plus CSV import
- **System Map** - Hydrants, valves, wells, meters, and reservoirs over town parcels, with VCGI color orthoimagery
- **Infrastructure** - Manage infrastructure points and their photos
- **Activity Log** - Rich text log posts with images and mentions
- **Contacts** - Contact directory
- **Reports** - Generate reports (including PDF) from collected data
- **Users** - Role-based access (admin, editor, member) and invitations
- **Notifications** - Email and SMS alerts via SendGrid and Twilio, with per-user preferences

## Getting Started

### Prerequisites

- Node.js 20.9+ (required by Next.js 16)
- A Supabase project
- A Mapbox access token

### Environment Variables

Create a `.env.local` file:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Required for user management (inviting and managing users)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000   # Base URL for invite email links

# Required only for the scripts in scripts/ (Supabase dashboard > Settings > API)
SUPABASE_SECRET_KEY=your-secret-key

# Optional - lets cold server instances verify sessions without fetching keys.
# Copy the JSON from {NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json
SUPABASE_JWKS={"keys":[...]}

# Optional - Reads the meter value from photos taken on the daily round
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional - Email notifications
# The from address must be on a domain authenticated in SendGrid, not a
# gmail.com or similar address, or receiving servers will reject or spam it
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=notifications@your-domain.org
SENDGRID_FROM_NAME=Richmond Fire District
CRON_SECRET=your-vercel-cron-secret
```

`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SECRET_KEY` both bypass row-level security. Keep them server-side and never prefix them with `NEXT_PUBLIC_`.

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Database Setup

The schema lives in numbered SQL migrations in `supabase/migrations/`. Apply them in order, either with the Supabase CLI:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

or by running each file in the Supabase SQL editor.

PostGIS is installed in the `extensions` schema, not `public` (see migration 016). Any `SECURITY DEFINER` function that uses `ST_*` functions must set `search_path = public, extensions`. [CLAUDE.md](./CLAUDE.md) has the full background.

After the migrations:

1. Run `npx tsx scripts/setup-storage.ts` to create the `infrastructure-images` bucket (see [Scripts](#scripts)).
2. Create a private `log-images` bucket in the Supabase dashboard (Storage). Migration 010 adds its policies but doesn't create the bucket.
3. Run `npx tsx scripts/import-parcels.ts` to load parcel boundaries for the map.

## Development Commands

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Scripts

One-off maintenance scripts live in `scripts/` and run with [`tsx`](https://tsx.is) (`npx` fetches it if needed). Each loads `.env.local` itself and needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`. They run against whichever project `NEXT_PUBLIC_SUPABASE_URL` points to, so check that before you run one.

### `import-parcels.ts`

```bash
npx tsx scripts/import-parcels.ts
```

Imports Richmond's parcel boundaries from VCGI into the `parcels` table:

1. Downloads `VTPARCELS_Richmond.zip` from VCGI and unzips it to `/tmp/parcel-import` (needs `unzip` on your `PATH`).
2. Merges multi-part parcels that share a parcel ID into single MultiPolygons.
3. Reprojects from Vermont State Plane (EPSG:32145) to WGS84 (EPSG:4326).
4. **Deletes every row in `parcels`**, then inserts the new data in batches of 100.
5. Removes the temporary files.

Re-running it is safe, because parcels are read-only reference data that nothing in the app edits. The map shows no parcels while the script runs. A handful of parcels have self-intersecting polygons in VCGI's source data and fail `ST_IsValid`. That's expected.

### `setup-storage.ts`

```bash
npx tsx scripts/setup-storage.ts
```

Creates the private `infrastructure-images` storage bucket (JPEG, PNG, and WebP, 5 MB max). If the bucket already exists, it does nothing. Its access policies come from migration 005.

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth callback, password reset
│   ├── (dashboard)/              # Protected dashboard routes
│   │   └── dashboard/
│   │       ├── page.tsx          # Main dashboard
│   │       ├── readings/         # Meter, chlorine, reservoir data + CSV import
│   │       ├── map/              # System map
│   │       ├── infrastructure/   # Infrastructure management
│   │       ├── log/              # Activity log
│   │       ├── contacts/         # Contact directory
│   │       ├── reports/          # Report generation
│   │       ├── notifications/    # Notification preferences
│   │       ├── account/          # Account settings
│   │       └── admin/            # User management
│   └── api/                      # Cron and notification endpoints
│
├── components/                   # UI by feature (map, readings, log, ...); ui/ holds shadcn/ui primitives
├── hooks/                        # Client hooks
├── lib/
│   ├── supabase/                 # Supabase clients (browser, server, admin)
│   ├── auth/                     # Role-based access helpers
│   ├── actions/                  # Server Actions (CRUD operations)
│   ├── services/                 # Email/SMS notification services
│   ├── pdf/                      # PDF report generation
│   └── types/                    # TypeScript interfaces
│
├── supabase/
│   ├── config.toml               # Supabase CLI config
│   └── migrations/               # Numbered SQL migrations
│
├── scripts/                      # Maintenance scripts (see Scripts)
└── proxy.ts                      # Session check for protected routes
```

## User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access including user management |
| `editor` | Create, read, update, delete data |
| `member` | Read-only access |

## Map Data Sources

- **Base map**: Mapbox `satellite-streets-v12`
- **Orthoimagery**: [VCGI](https://vcgi.vermont.gov) "Best of Color" imagery cache. Shown by default and can be turned off in the map's Layers panel. It's a mosaic of photos from different flights, so seams and leaf-off areas are normal.
- **Parcels**: VCGI's VTPARCELS dataset for Richmond, loaded with `scripts/import-parcels.ts`

## Deployment

This application is deployed on [Vercel](https://vercel.com).

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in the Vercel dashboard (set `NEXT_PUBLIC_APP_URL` to the production URL)
4. Deploy

### Cron Jobs

Cron jobs are configured in `vercel.json` and need `CRON_SECRET` set in Vercel:

| Schedule | Endpoint | Description |
|----------|----------|-------------|
| Daily 12:00 UTC (7–8am Eastern) | `/api/cron/daily` | Missing reading alerts + daily digests |
| Monday 12:00 UTC | `/api/cron/weekly` | Weekly digests |

To run a job by hand, send the same header Vercel does:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://richmond-fire-district.vercel.app/api/cron/daily
```

### Notifications

Notifications are email only for now. Users choose them at `/dashboard/notifications`, which also has a button that sends a test email. New log posts are emailed when they're created, and missing reading alerts and digests go out from the cron jobs. Each gap in readings gets one missing reading alert rather than one every day.

Email templates are React Email components in `emails/`. To preview them with sample data:

```bash
npm run email
```

SMS through Twilio (`lib/services/sms.ts`) isn't wired up. Twilio can't text US numbers until the sending number has A2P 10DLC or toll-free verification.

## Documentation

For detailed development guidelines, see [CLAUDE.md](./CLAUDE.md).

## License

Private - Richmond Fire District
