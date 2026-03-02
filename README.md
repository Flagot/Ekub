# Ekub App (Rebuild Repo)

This repository tracks the rebuild of the Ekub MVP in a clean, commit-by-commit workflow.

## Stack

- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth
- Frontend: React, Vite, Tailwind CSS

## Project Structure

- `Backend/` API server and domain logic
- `Frontend/` web client

## Local Setup

### 1) Clone and install

```bash
git clone <your-repo-url>
cd Ekub
```

Install dependencies per app:

```bash
cd Backend && npm install
cd ../Frontend && npm install
```

### 2) Environment variables

Create local env files before running:

- `Backend/.env`
- `Frontend/.env` (if needed)

See `.env.example` files in each app once they are added.

### 3) Run development servers

Backend:

```bash
cd Backend
npm run dev
```

Frontend:

```bash
cd Frontend
npm run dev
```

## Development Notes

- This repo is intentionally built in small daily increments.
- Each milestone is designed to be commit-worthy on its own.
- Some follow-up commits will include bug fixes and refactors to reflect realistic development.
