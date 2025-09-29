# Carbon Activity Tracking System (CATS)

CATS is a learning scaffold that demonstrates a very small end-to-end stack:

- **Frontend** – a Vite + Vue 3 single page app that renders a demo login screen
  and, after a successful sign in, shows a placeholder dashboard layout.
- **Backend** – a minimal ASP.NET Core API that serves `Hello, CATS!` from the
  root endpoint and streams sample data from a CSV file at `/data`.

The project purposely keeps the functionality light so new contributors can
focus on wiring the stack together before the full product requirements are
introduced.

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [pnpm](https://pnpm.io/) or npm (the commands below use npm)
- [.NET SDK 8.0](https://dotnet.microsoft.com/)

---

## 🚀 Running the project locally

### 1. Start the backend API

```bash
cd backend
dotnet restore
dotnet run
```

The API listens on `http://localhost:5000` by default. Visit
`http://localhost:5000/` for the greeting or `http://localhost:5000/data` to see
sample JSON transformed from `database/sample-data.csv`.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite dev server URL printed in the terminal (usually
`http://localhost:5173`). You should see the login page immediately.

Use any credentials to sign in. The app stores the supplied user ID and
verification code in `localStorage` and swaps to a dashboard layout with a
placeholder navigation bar.

> **Handsontable dependency** – Several admin pages now render interactive
> tables with [Handsontable](https://handsontable.com/). The project loads the
> library and its styles from the official CDN at runtime, so make sure your
> development environment has internet access when visiting those pages. No
> extra installation steps are required beyond `npm install` above.

---

## 🧭 Repository structure

```
backend/   # ASP.NET Core minimal API
frontend/  # Vue 3 single-page app with login + dashboard demo
```

- `database/sample-data.csv` – records returned by the `/data` endpoint
- `docs/` – miscellaneous design notes and experiments
- `tests/` – placeholder directory for future automation

---

## 📦 Future improvements

- Replace the client-side only authentication with real API integration
- Connect the backend to SQL Server and expose CRUD endpoints
- Build out dashboard widgets fed by live emissions data
- Add automated tests and CI pipelines

