# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Laravel 12.30.1 application using Vite for asset compilation and TailwindCSS v4 for styling. The project uses SQLite as the default database.

## Essential Commands

### Development

- `composer dev` - Start all development services concurrently (Laravel server, queue listener, logs, and Vite)
- `php artisan serve` - Start the Laravel development server only
- `npm run dev` - Start Vite development server for frontend assets
- `php artisan queue:listen --tries=1` - Start queue worker
- `php artisan pail` - View application logs in real-time

### Build & Testing

- `npm run build` - Build frontend assets for production
- `composer test` - Run PHPUnit tests (clears config cache first)
- `php artisan test` - Run tests directly
- `php artisan test --filter TestName` - Run a specific test
- `vendor/bin/pint` - Format PHP code using Laravel Pint

### Database

- `php artisan migrate` - Run database migrations
- `php artisan migrate:fresh` - Drop all tables and re-run migrations
- `php artisan db:seed` - Run database seeders
- `php artisan tinker` - Interactive PHP REPL with Laravel context

### Code Quality

- `vendor/bin/pint` - Run Laravel Pint for code formatting
- `vendor/bin/pint --test` - Check code formatting without making changes

## Architecture Notes

### Directory Structure

- **app/Http/Controllers/** - HTTP controllers for handling requests
- **app/Models/** - Eloquent ORM models
- **database/migrations/** - Database schema migrations
- **routes/web.php** - Web routes definitions
- **resources/views/** - Blade templates
- **resources/css/** - CSS files (processed by Vite/TailwindCSS)
- **resources/js/** - JavaScript files (processed by Vite)

### Key Configuration

- Database: SQLite (database/database.sqlite)
- Session/Cache/Queue: Database-driven
- Frontend Build: Vite with Laravel plugin
- CSS Framework: TailwindCSS v4 with Vite plugin
- PHP Code Style: Laravel Pint (based on Laravel's opinionated PHP CS Fixer rules)

### Development Workflow

1. Environment setup requires copying `.env.example` to `.env` and generating an app key
2. The `composer dev` script runs all services concurrently with color-coded output
3. Frontend assets are compiled through Vite with hot module replacement in development
4. Database uses SQLite by default, located at `database/database.sqlite`

## Tailwind 4

- Always use Tailwind CSS v4 - do not use the deprecated utilities.
- `corePlugins` is not supported in Tailwind v4.
- In Tailwind v4, you import Tailwind using a regular CSS `@import` statement, not using the `@tailwind` directives used in v3:

<code-snippet name="Tailwind v4 Import Tailwind Diff" lang="diff">
   - @tailwind base;
   - @tailwind components;
   - @tailwind utilities;
   + @import "tailwindcss";
</code-snippet>

### Replaced Utilities

- Tailwind v4 removed deprecated utilities. Do not use the deprecated option - use the replacement.
- Opacity values are still numeric.

| Deprecated | Replacement |
|------------+--------------|
| bg-opacity-* | bg-black/* |
| text-opacity-* | text-black/* |
| border-opacity-* | border-black/* |
| divide-opacity-* | divide-black/* |
| ring-opacity-* | ring-black/* |
| placeholder-opacity-* | placeholder-black/* |
| flex-shrink-* | shrink-* |
| flex-grow-* | grow-* |
| overflow-ellipsis | text-ellipsis |
| decoration-slice | box-decoration-slice |
| decoration-clone | box-decoration-clone |
</laravel-boost-guidelines>
