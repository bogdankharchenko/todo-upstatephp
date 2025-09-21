# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a simple Todo application built with Alpine.js and Tailwind CSS. It's a single-page application implemented entirely in `index.html` with no build process or backend dependencies.

## Architecture

### Technology Stack
- **Alpine.js 3.x**: Reactive JavaScript framework loaded via CDN
- **Tailwind CSS 4**: CSS framework loaded via browser CDN
- **LocalStorage**: For persistent todo data storage

### Key Components

The application is a single HTML file (`index.html`) containing:
1. **Todo App Component** (`todoApp()`): Main Alpine.js component managing todo state
2. **Data Model**: Todos stored as objects with `id`, `text`, `completed`, and `createdAt` properties
3. **State Management**: Uses Alpine.js reactive data with localStorage persistence
4. **Filtering System**: Three filter states (all, active, completed) for viewing todos

## Development Commands

Since this is a static HTML application with no build process:

```bash
# Open the application locally
open index.html
```

## Working with the Codebase

### Making Changes
- All application logic is in `index.html`
- The Alpine.js component (`todoApp()`) starts at line 120
- Styling uses Tailwind utility classes directly in HTML
- Custom transitions are defined in the `<style>` tag

### Adding Features
When implementing new features:
1. Modify the Alpine.js component data or methods
2. Update the HTML template as needed
3. Add any required Tailwind classes inline
4. Ensure localStorage persistence is maintained

### Testing Changes
Simply refresh the browser after saving changes to `index.html`. No compilation or build step required.
