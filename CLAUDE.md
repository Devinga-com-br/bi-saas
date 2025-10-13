# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-tenant BI SaaS application built with Next.js 15, React 19, TypeScript, and Supabase. The application uses the App Router pattern and implements authentication with role-based access control (admin, user, viewer).

## Development Commands

```bash
# Start development server (with Turbopack)
npm run dev

# Build for production (with Turbopack)
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

Development server runs at http://localhost:3000

## Architecture

### Multi-Tenancy Model

The application implements tenant isolation at the database level:
- **Tenants**: Organizations/companies using the platform (via `tenants` table)
- **User Profiles**: Users belong to a single tenant (via `user_profiles` table with `tenant_id`)
- Each user has a role: `admin`, `user`, or `viewer`

### Authentication Flow

1. **Supabase SSR Pattern**: Three separate Supabase client instances for different contexts:
   - [src/lib/supabase/client.ts](src/lib/supabase/client.ts) - Browser client (Client Components)
   - [src/lib/supabase/server.ts](src/lib/supabase/server.ts) - Server client (Server Components, API routes)
   - [src/lib/supabase/middleware.ts](src/lib/supabase/middleware.ts) - Middleware client (route protection)

2. **Route Protection** ([src/middleware.ts](src/middleware.ts)):
   - Public routes: `/login`, `/cadastro`
   - Unauthenticated users → redirected to `/login`
   - Authenticated users on public routes → redirected to `/dashboard`

3. **OAuth Callback**: [src/app/api/auth/callback/route.ts](src/app/api/auth/callback/route.ts) handles OAuth code exchange

### Application Structure

**Route Groups** (Next.js 15 App Router):
- `(auth)` - Authentication pages (login, cadastro) - uses centered card layout
- `(dashboard)` - Protected dashboard pages - uses DashboardShell layout

**Key Components**:
- **DashboardShell** ([src/components/dashboard/dashboard-shell.tsx](src/components/dashboard/dashboard-shell.tsx)): Main layout with Sidebar + TopBar + content area
- **Sidebar**: Navigation menu
- **TopBar**: Header with UserMenu dropdown

**Custom Hooks**:
- `useUser()` ([src/hooks/use-user.ts](src/hooks/use-user.ts)): Get current authenticated user with real-time auth state changes
- `useTenant()` ([src/hooks/use-tenant.ts](src/hooks/use-tenant.ts)): Get user profile with joined tenant data

### UI Components

Uses **shadcn/ui** with the New York style variant:
- Configuration: [components.json](components.json)
- Base color: slate
- Icon library: lucide-react
- Components stored in `@/components/ui`

**IMPORTANT**: When adding new shadcn/ui components, ensure `React.forwardRef` uses proper TypeScript generic syntax:
```typescript
// ✅ Correct
const Component = React.forwardRef<ElementType, PropsType>(...)

// ❌ Incorrect (will cause parsing errors)
const Component = React.forwardRef
  ElementType,
  PropsType
>(...)
```

Path aliases configured in [tsconfig.json](tsconfig.json):
- `@/*` → `./src/*`

### Database Type Safety

- **Database Types**: [src/types/database.types.ts](src/types/database.types.ts) - Generated types from Supabase schema
- **Domain Types**: [src/types/index.ts](src/types/index.ts) - Application-specific types derived from database types

Type pattern:
```typescript
import type { Database } from '@/types/database.types'
// Use Database['public']['Tables']['table_name']['Row']
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

## Charts and Data Visualization

### Chart.js Integration

The application uses **Chart.js v4** with **react-chartjs-2** for data visualization:

**Core Configuration**: [src/lib/chart-config.ts](src/lib/chart-config.ts)
- Chart registration and tree-shaking setup
- Default options following design system
- Color palette (primary, secondary, success, warning, error)
- Helper functions for creating datasets
- Formatters for currency, numbers, and percentages

**Chart Components**: [src/components/charts/](src/components/charts/)
- `AreaChart` - Area/filled line charts
- `LineChart` - Line charts
- `BarChart` - Bar charts (vertical/horizontal)

All chart components are **Client Components** (`'use client'`) and auto-register Chart.js elements.

### Creating Charts - Best Practices

**1. Import Chart Component:**
```typescript
import { AreaChart } from '@/components/charts/area-chart'
import { createAreaDataset, chartColorsRGBA } from '@/lib/chart-config'
```

**2. Prepare Chart Data:**
```typescript
const chartData = {
  labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
  datasets: [
    createAreaDataset(
      'Receita',
      [4500, 5200, 4800, 6100, 5900, 7200],
      chartColorsRGBA.primary,
      chartColorsRGBA.primaryLight
    ),
  ],
}
```

**3. Render Chart:**
```typescript
<AreaChart data={chartData} height={350} />
```

### Chart Helper Functions

**Dataset Creators:**
- `createAreaDataset(label, data, color, fillColor)` - Area chart dataset
- `createLineDataset(label, data, color)` - Line chart dataset
- `createBarDataset(label, data, color)` - Bar chart dataset

**Formatters:**
- `formatCurrency(value)` - R$ 1.234,56
- `formatNumber(value)` - 1.234
- `formatPercentage(value)` - 12.5%

**Colors Available:**
```typescript
chartColorsRGBA.primary      // Blue
chartColorsRGBA.secondary    // Purple
chartColorsRGBA.success      // Green
chartColorsRGBA.warning      // Orange
chartColorsRGBA.error        // Red
```

Each color has a `Light` variant for fills (e.g., `primaryLight`).

### Chart Options Customization

Override default options per chart:
```typescript
<AreaChart
  data={chartData}
  options={{
    plugins: {
      legend: { position: 'bottom' }
    },
    scales: {
      y: { max: 10000 }
    }
  }}
/>
```

### Performance Notes

- Chart.js uses **tree-shaking** - only registered elements are bundled
- Registration happens once via `registerChartJS()` in chart components
- Charts are **canvas-based** for optimal performance with large datasets
- Use `maintainAspectRatio: false` for responsive sizing

### When to Use Each Chart Type

- **AreaChart**: Trends over time with emphasis on volume (e.g., revenue, users)
- **LineChart**: Trends over time comparing multiple metrics
- **BarChart**: Comparing values across categories or periods

## Important Notes

- **Turbopack**: Both dev and build use `--turbopack` flag (Next.js 15 default)
- **Tailwind CSS v4**: Uses new @tailwindcss/postcss plugin
- **Server Components**: Default in App Router - use `'use client'` directive only when needed (auth hooks, state, event handlers)
- **Portuguese UI**: Application is in Brazilian Portuguese (login → "Entrar", register → "Cadastro")
- When creating new Supabase queries, always import the correct client for the context (browser/server/middleware)
- **Charts**: Always use wrapper components from `@/components/charts/` instead of importing Chart.js directly
