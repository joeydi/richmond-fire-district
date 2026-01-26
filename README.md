# Richmond Fire District Water System

A full-stack water system management application for tracking water infrastructure, meter readings, chlorine levels, reservoir data, and maintenance activities. Built for fire district personnel with role-based access control.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js](https://nextjs.org) 16 | React framework with App Router |
| [React](https://react.dev) 19 | UI library |
| [TypeScript](https://www.typescriptlang.org) | Type-safe JavaScript |
| [Supabase](https://supabase.com) | PostgreSQL database, auth, storage |
| [Tailwind CSS](https://tailwindcss.com) 4 | Utility-first styling |
| [shadcn/ui](https://ui.shadcn.com) | Radix UI components |
| [MapboxGL](https://www.mapbox.com/mapbox-gljs) | Interactive mapping |
| [React Hook Form](https://react-hook-form.com) | Form state management |
| [Zod](https://zod.dev) | Schema validation |

## Features

- **Dashboard** - Overview stats, charts, and recent activity
- **Meter Readings** - Track and manage water meter data with production rates
- **Chlorine Readings** - Monitor chlorine residual measurements
- **Reservoir Readings** - Record reservoir level data
- **Infrastructure Map** - Interactive map of hydrants, valves, wells, and meters
- **Activity Log** - Rich text activity logs with image support
- **Contact Directory** - Manage contact information
- **Reports** - Generate reports from collected data
- **User Management** - Role-based access (admin, editor, member)
- **Notifications** - Email and SMS alerts via SendGrid and Twilio

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase project
- Mapbox account (for maps)

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Optional - Notifications
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@example.com
SENDGRID_FROM_NAME=Richmond Fire District
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890
CRON_SECRET=your-vercel-cron-secret
NOTIFICATION_API_SECRET=your-notification-api-secret
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Development Commands

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, callback)
│   ├── (dashboard)/              # Protected dashboard routes
│   │   └── dashboard/
│   │       ├── page.tsx          # Main dashboard
│   │       ├── readings/         # Meter, chlorine, reservoir data
│   │       ├── map/              # Infrastructure map
│   │       ├── contacts/         # Contact directory
│   │       ├── infrastructure/   # Infrastructure management
│   │       ├── log/              # Activity logs
│   │       ├── reports/          # Report generation
│   │       └── admin/            # Admin user management
│   └── api/                      # API routes (cron, notifications)
│
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # Header, sidebar, shell
│   ├── dashboard/                # Stats, charts, cards
│   ├── map/                      # MapboxGL components
│   └── readings/                 # Reading forms and tables
│
├── lib/
│   ├── supabase/                 # Supabase client (browser/server)
│   ├── auth/                     # Role-based access helpers
│   ├── actions/                  # Server Actions (CRUD operations)
│   └── types/                    # TypeScript interfaces
│
├── supabase/
│   └── migrations/               # SQL migrations
│
└── scripts/                      # Utility scripts
```

## User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access including user management |
| `editor` | Create, read, update, delete data |
| `member` | Read-only access |

## Deployment

This application is designed to be deployed on [Vercel](https://vercel.com).

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Cron Jobs

Cron jobs are configured in `vercel.json` and run automatically:

| Schedule | Endpoint | Description |
|----------|----------|-------------|
| Daily 8am UTC | `/api/cron/daily` | Check missing readings + daily digests |
| Monday 8am UTC | `/api/cron/weekly` | Weekly digest emails |

## Documentation

For detailed development guidelines, see [CLAUDE.md](./CLAUDE.md).

## License

Private - Richmond Fire District
