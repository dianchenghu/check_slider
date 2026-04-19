# React Flow Database Schema Demo

An interactive database schema visualization demo project based on React Flow.

## Features

- 🎨 Uses React Flow UI Database Schema Node component
- 🔗 Interactive node connections
- 📊 Visualize database table structures and relationships
- 🎯 Modern development experience with Vite + React + TypeScript

## Tech Stack

- **React Flow** - Node graph visualization library
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Styling framework
- **Vite** - Build tool
- **TypeScript** - Type safety

## Quick Start

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

The project will start at `http://localhost:5173`.

### Environment Variables

Create a `.env` file with your Firebase project settings:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
reactflow-database-schema-demo/
├── src/
│   ├── components/
│   │   ├── DatabaseSchemaDemo.tsx    # Database schema node component
│   │   ├── database-schema-node.tsx   # Database Schema Node component
│   │   ├── labeled-handle.tsx        # Labeled Handle component
│   │   └── base-node.tsx             # Base node component
│   ├── lib/
│   │   └── utils.ts                  # Utility functions
│   ├── App.tsx                       # Main application component
│   ├── main.tsx                      # Application entry point
│   └── index.css                     # Global styles
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Usage

The current demo shows relationships between three database tables:
- **Products** - Products table
- **Warehouses** - Warehouses table
- **Suppliers** - Suppliers table

You can:
- Drag nodes to move them
- Create new connections through connection points
- View foreign key relationships between tables

## Customization

You can modify node styles and behaviors in `src/components/DatabaseSchemaDemo.tsx`, or add more nodes and connections in `src/App.tsx`.

## References

- [React Flow Documentation](https://reactflow.dev)
- [React Flow UI Components](https://reactflow.dev/ui/components/database-schema-node)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## License

MIT
