# Water System Management App - Implementation Plan

## Overview

A Next.js web app for the Richmond Fire District to manage their water system. Features time-series data recording, monitoring dashboards, interactive maps, and contact management.

**Tech Stack:**
- Next.js 16.1.1 (App Router) - already set up
- Tailwind CSS v4 - already configured
- shadcn/ui - needs installation
- Supabase (database + auth) - needs setup
- MapboxGL - needs installation

---

## Database Schema (Supabase)

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles extending Supabase Auth (id, email, full_name, role: admin/editor/member) |
| `water_production_readings` | Meter readings (recorded_at, meter_id, reading_value, notes) |
| `chlorine_readings` | Chlorine levels (recorded_at, location_id, residual_level, notes) |
| `reservoir_readings` | Reservoir levels (recorded_at, reservoir_id, level_feet, level_percent) |
| `infrastructure_points` | Map points (type, name, lat/lng, properties, status) - types: shutoff_valve, hydrant, well, meter, reservoir |
| `contacts` | Contact directory (name, address, phone, email, contact_type) |
| `meters` | Reference table for water meters |
| `reservoirs` | Reference table for reservoirs |
| `parcels` | Parcel boundaries with PostGIS geometry for spatial queries (parcel_id, owner_name, address, geometry) |

### User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access: manage users, edit system data (infrastructure, meters, reservoirs, parcels), add/edit readings and contacts |
| `editor` | Add and edit meter readings (water production, chlorine, reservoir levels), add/edit contacts |
| `member` | View-only access to all data (dashboard, map, readings history, contacts) |

### Row Level Security

| Table | Member | Editor | Admin |
|-------|--------|--------|-------|
| `profiles` | View all | View all | View all, manage users |
| `water_production_readings` | View | View, Insert, Update | Full access |
| `chlorine_readings` | View | View, Insert, Update | Full access |
| `reservoir_readings` | View | View, Insert, Update | Full access |
| `infrastructure_points` | View | View | Full access |
| `contacts` | View | View, Insert, Update | Full access |
| `meters` | View | View | Full access |
| `reservoirs` | View | View | Full access |
| `parcels` | View | View | Full access |

---

## Application Structure

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── auth/callback/route.ts
├── (dashboard)/
│   ├── layout.tsx              # Sidebar + header shell
│   ├── dashboard/page.tsx      # Monitoring dashboard
│   ├── readings/
│   │   ├── page.tsx            # Reading type selector
│   │   ├── water-production/page.tsx
│   │   ├── chlorine/page.tsx
│   │   └── reservoir/page.tsx
│   ├── map/page.tsx            # System overview map
│   ├── contacts/
│   │   ├── page.tsx            # Contacts table
│   │   ├── new/page.tsx
│   │   └── [id]/edit/page.tsx
│   └── admin/                  # Admin-only routes
│       └── users/
│           ├── page.tsx        # User management
│           └── [id]/edit/page.tsx

components/
├── ui/                         # shadcn/ui components
├── layout/                     # Sidebar, header, mobile-nav
├── readings/                   # Mobile-optimized entry forms
├── dashboard/                  # Charts, stats cards, KPI grid
├── map/                        # MapboxGL layers and controls
└── contacts/                   # Table and forms

lib/
├── supabase/                   # Client and server clients
├── actions/                    # Server actions for CRUD
├── hooks/                      # Custom React hooks
└── types/                      # TypeScript types
```

---

## Implementation Phases

### Phase 1: Foundation Setup
1. Install dependencies:
   - `@supabase/supabase-js`, `@supabase/ssr`
   - `mapbox-gl`, `@types/mapbox-gl`
   - `zod`, `react-hook-form`, `@hookform/resolvers`
   - `date-fns`, `clsx`, `tailwind-merge`
2. Initialize shadcn/ui: `npx shadcn@latest init`
3. Create Supabase client files (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
4. Set up middleware for auth token refresh
5. Create dashboard layout shell with sidebar

### Phase 2: Authentication & Authorization
1. Create Supabase project and run schema migrations
2. Build login page with email/password auth
3. Implement logout route and auth callback
4. Configure middleware to protect `/dashboard/*` routes
5. Create role-based access control helpers (admin/editor/member)
6. Build user management page for admins (invite users, assign roles)

### Phase 3: Data Entry (Mobile-First)
1. Create server actions for inserting readings
2. Build water production form with large touch targets
3. Build chlorine reading form with range validation (0.2-4.0 mg/L)
4. Build reservoir level form with visual gauge
5. Add toast notifications for success/error

### Phase 4: Monitoring Dashboard
1. Create database functions for usage statistics
2. Build usage chart component with date range selector
3. Build stats cards for KPIs (daily/monthly/yearly averages)
4. Compose dashboard page with responsive grid

### Phase 5: Map Integration
1. Configure MapboxGL with aerial photo base layer
2. Create infrastructure layer with icons per type
3. Add parcel boundary layer with hover effects
4. Build popups for infrastructure details
5. Add layer toggle controls and legend

### Phase 6: Contacts Management
1. Create CRUD server actions for contacts
2. Build contacts data table with search/sort
3. Create contact form for add/edit
4. Add delete confirmation dialog

### Phase 7: Parcel Data Import & Spatial Queries

**Data Source:**
- Vermont GIS Parcel Data: https://maps.vcgi.vermont.gov/gisdata/vcgi/packaged_zips/CadastralParcels_VTPARCELS/VTPARCELS_Richmond.zip

**Database Setup:**
1. Enable PostGIS extension in Supabase
2. Update `parcels` table schema to use PostGIS geometry type
3. Create spatial index on geometry column for fast viewport queries

**Schema:**
```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Parcels table with geometry
CREATE TABLE parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id TEXT NOT NULL,
  owner_name TEXT,
  address TEXT,
  geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Spatial index for viewport queries
CREATE INDEX parcels_geometry_idx ON parcels USING GIST (geometry);

-- Index for parcel_id lookups
CREATE INDEX parcels_parcel_id_idx ON parcels (parcel_id);
```

**Import Pipeline:**
1. Create import script (`scripts/import-parcels.ts`)
2. Download shapefile from VCGI
3. Convert shapefile to GeoJSON using `ogr2ogr` or `shpjs`
4. Parse and insert into Supabase with geometry

**Viewport Query API:**
1. Create server action for spatial queries (`lib/actions/parcels.ts`)
2. Accept bounding box (minLng, minLat, maxLng, maxLat)
3. Return parcels intersecting viewport using `ST_Intersects`
4. Update map to fetch parcels on viewport change

**Implementation Steps:**
1. Enable PostGIS extension in Supabase dashboard
2. Run schema migration for parcels table with geometry
3. Create parcel import script
4. Download and import Richmond parcel data
5. Create viewport-based query endpoint
6. Update map component to fetch parcels dynamically
7. Add admin UI for re-importing/updating parcel data

**Query Example:**
```sql
SELECT
  id, parcel_id, owner_name, address,
  ST_AsGeoJSON(geometry) as geometry
FROM parcels
WHERE ST_Intersects(
  geometry,
  ST_MakeEnvelope($minLng, $minLat, $maxLng, $maxLat, 4326)
)
LIMIT 500;
```

---

## Key Files to Create/Modify

| File | Purpose |
|------|---------|
| `lib/supabase/server.ts` | Server-side Supabase client with cookie handling |
| `lib/supabase/client.ts` | Browser-side Supabase client |
| `lib/auth/roles.ts` | Role-based access control helpers (requireAdmin, requireEditor, etc.) |
| `middleware.ts` | Auth middleware for route protection |
| `app/(dashboard)/layout.tsx` | Dashboard shell with navigation |
| `components/readings/water-production-form.tsx` | Primary mobile data entry pattern |
| `components/map/map-container.tsx` | MapboxGL initialization |
| `scripts/import-parcels.ts` | Parcel data import script (shapefile → Supabase) |
| `lib/actions/parcels.ts` | Viewport-based parcel queries with PostGIS |
| `.env.local` | Environment variables (Supabase URL/key, Mapbox token) |

---

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

---

## Setup Prerequisites

### Supabase Project (needs to be created)
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy the project URL and anon key to `.env.local`
3. Run the database schema migrations (SQL provided during implementation)
4. Enable email auth in Authentication settings

### Mapbox (ready)
- You have a token ready to use

### GIS Data
**Parcel Data:**
- Source: Vermont Center for Geographic Information (VCGI)
- URL: https://maps.vcgi.vermont.gov/gisdata/vcgi/packaged_zips/CadastralParcels_VTPARCELS/VTPARCELS_Richmond.zip
- Format: Shapefile (convert to GeoJSON for import)
- Import: Use `scripts/import-parcels.ts` to load into Supabase

**Infrastructure Data:**
- Manual entry through admin interface
- GPS coordinates collected in the field
- Existing CAD drawings or maps of the water system

---

## Verification Plan

1. **Authentication**: Log in, verify protected routes redirect when logged out
2. **Data Entry**: Submit readings on mobile device, verify data appears in Supabase
3. **Dashboard**: Confirm charts render with sample data, test date range filters
4. **Map**: Verify aerial imagery loads, infrastructure points display, parcels render
5. **Contacts**: Test full CRUD - create, view, edit, delete contacts
6. **Mobile**: Test all forms on actual mobile device for touch usability
7. **Parcel Import**: Run import script, verify parcels load on map, test viewport queries return correct subset
