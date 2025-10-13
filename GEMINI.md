# Project Overview

This is a multi-tenant BI SaaS dashboard built with Next.js, React, TypeScript, and Supabase. It features a modern UI with interactive charts, a complete authentication system, and a multi-tenancy architecture with role-based access control.

## Key Technologies

- **Framework:** Next.js 15 (App Router + Turbopack)
- **UI:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui
- **Backend:** Supabase (Auth + PostgreSQL)
- **Charts:** Chart.js v4 + react-chartjs-2
- **Icons:** lucide-react

# Building and Running

## Prerequisites

- Node.js 18+ or 20+
- npm 9+ or 10+
- A Supabase account

## Setup

1.  **Clone the repository:**
    ```bash
    git clone <repo-url>
    cd bi-saas
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**

    Create a `.env.local` file in the root of the project with the following content:

    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```

4.  **Set up Supabase:**

    Execute the SQL migrations in the `supabase/migrations` directory in your Supabase dashboard.

5.  **Start the development server:**
    ```bash
    npm run dev
    ```

    The application will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

-   `npm run dev`: Starts the development server with Turbopack.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts the production server.
-   `npm run lint`: Lints the codebase.
-   `npm run clean`: Removes the `.next` and `node_modules/.cache` directories.
-   `npm run clean:all`: Removes the `.next`, `node_modules/.cache`, `node_modules`, and `package-lock.json` files, and then runs `npm install`.

# Development Conventions

## Authentication and Authorization

-   Authentication is handled by Supabase Auth.
-   Route protection is implemented using middleware (`src/middleware.ts`).
-   The middleware checks for a valid user session and redirects to the login page if the user is not authenticated.
-   Role-based access control is implemented in the middleware to restrict access to certain routes based on user roles (e.g., `superadmin`, `admin`).

## Code Style

-   The project uses ESLint for code linting.
-   The configuration is in the `eslint.config.mjs` file.
-   Run `npm run lint` to check for linting errors.

## Components

-   The project uses `shadcn/ui` for UI components.
-   Components are located in the `src/components/ui` directory.
-   Custom components are located in the `src/components` directory, organized by feature.

## Charts

-   The project uses Chart.js for data visualization.
-   Chart components are located in the `src/components/charts` directory.
-   Chart configuration is in the `src/lib/chart-config.ts` file.
