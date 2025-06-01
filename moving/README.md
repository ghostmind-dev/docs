# Moving Clock

A simple Next.js application that displays a running clock. The clock runs continuously and cannot be paused or modified.

## Prerequisites

- Node.js 18+
- npm or yarn package manager

## Installation

1. Navigate to the app directory:

   ```bash
   cd app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

Copy `.env.template` to `.env` and configure as needed:

```bash
cp .env.template .env
```

The app will work with default values if no environment variables are set.

## Running Locally

Start the development server:

```bash
cd app
npm run dev
```

The app will be available at http://localhost:3000

## Testing

Run tests:

```bash
cd app
npm test
```

## Production Build

Build for production:

```bash
cd app
npm run build
npm start
```
