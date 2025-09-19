# Campus Life Events Dashboard

A modern, clean dashboard for managing campus events and organizers built with Next.js, TypeScript, and shadcn/ui.

## Features

- **Dashboard Overview**: Statistics and recent activity overview
- **Events Management**: Create, edit, delete, and view all events
- **Organizers Management**: Manage event organizers and their information
- **Analytics**: Visual charts and statistics about events and organizers
- **Settings**: Application configuration and preferences
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation
- **API Client**: Hey API (OpenAPI TypeScript client)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Integration

The dashboard connects to the backend API at `http://localhost:8080`. Make sure the backend is running before using the dashboard.

### Available Endpoints

- `GET /api/v1/events` - List all events
- `POST /api/v1/events` - Create a new event
- `PUT /api/v1/events/{id}` - Update an event
- `DELETE /api/v1/events/{id}` - Delete an event
- `GET /api/v1/organizers` - List all organizers
- `POST /api/v1/organizers` - Create a new organizer
- `PUT /api/v1/organizers/{id}` - Update an organizer
- `DELETE /api/v1/organizers/{id}` - Delete an organizer
- `GET /api/v1/audit-logs` - List audit log entries

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Dashboard home page
│   ├── events/            # Events management pages
│   ├── organizers/        # Organizers management pages
│   ├── analytics/         # Analytics dashboard
│   └── settings/          # Settings page
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard-sidebar.tsx
│   ├── event-dialog.tsx
│   └── organizer-dialog.tsx
├── client/               # Generated API client
└── lib/                  # Utility functions
```

## Features Overview

### Dashboard
- Real-time statistics (total events, upcoming events, organizers, published events)
- Recent events overview
- Upcoming events preview

### Events Management
- Create new events with German and English titles/descriptions
- Set start and end dates/times
- Configure publication settings (app, newsletter)
- Add external event URLs
- Search and filter events
- Bulk operations

### Organizers Management
- Create and manage organizer profiles
- Add descriptions in multiple languages
- Link to websites and social media
- View event statistics per organizer

### Analytics
- Event creation trends
- Organizer activity distribution
- Audit log visualization
- Publication status statistics

### Settings
- API configuration
- Notification preferences
- Data export/import
- System information

## Development

### Code Generation

The API client is automatically generated from the OpenAPI specification:

```bash
npm run openapi-ts
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for type safety
3. Write meaningful component and function names
4. Add proper error handling
5. Test your changes thoroughly

## License

This project is part of the Campus Life Events system.