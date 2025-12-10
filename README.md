# Fullstack App (DevOps Practice)

Containerized fullstack application used as a DevOps learning and portfolio project.

- **Frontend:** React (Create React App) built and served by **Nginx**
- **Backend:** Node.js + Express, connecting to PostgreSQL
- **Database:** PostgreSQL 16
- **Orchestration:** Docker & Docker Compose

The goal of this project is to demonstrate a simple, production-like setup: separate services (db, backend, frontend), Docker images, and a single `docker compose up` to run everything.

---

## Project structure

```text
.
├── backend/          # Node.js backend (API, DB connection)
├── frontend/         # React frontend (built and served by Nginx)
├── docker-compose.yml
├── .env              # Environment variables (NOT committed to git)
└── .gitignore
```

---

## Requirements

- Docker & Docker Compose
- Node.js 18+ and npm (for local development without Docker)

---

## Environment variables

Create a `.env` file in the project root:

```env
POSTGRES_DB=fullstack_db
POSTGRES_USER=fullstack_user
POSTGRES_PASSWORD=fullstack_pass

BACKEND_PORT=3001

DATABASE_URL=postgres://fullstack_user:fullstack_pass@db:5432/fullstack_db
```

> `.env` is ignored by git and should not be committed.

---

## Running the stack with Docker

From the project root:

```bash
docker compose up --build
```

This will start:

- `db` → PostgreSQL on port **5432**
- `backend` → Node.js API on port **3001**
- `frontend` → Nginx + React on port **3000**

### URLs

- Frontend: `http://localhost:3000`
- Backend API (direct): `http://localhost:3001/api`
- Backend API (through Nginx): `http://localhost:3000/api`

The frontend sends requests to `/api`, which are proxied by Nginx to the `backend` service inside Docker. The backend then queries PostgreSQL using `DATABASE_URL`.

To stop the stack:

```bash
Ctrl + C        # in the docker compose terminal
docker compose down
```

---

## Local development without Docker (optional)

You can also run the services locally, if needed.

### 1. PostgreSQL (via Docker, single container)

```bash
docker run -d \
  --name fsapp-postgres-dev \
  -e POSTGRES_DB=fullstack_db \
  -e POSTGRES_USER=fullstack_user \
  -e POSTGRES_PASSWORD=fullstack_pass \
  -p 5432:5432 \
  postgres:16
```

### 2. Backend (Node.js)

```bash
cd backend
npm install
export DATABASE_URL=postgres://fullstack_user:fullstack_pass@localhost:5432/fullstack_db
export PORT=3001
node index.js
```

The backend exposes:

- `GET /` → simple health message
- `GET /api` → returns current time from PostgreSQL

### 3. Frontend (React dev server)

```bash
cd frontend
npm install
npm start
```

By default, CRA runs on port **3000** and uses the `proxy` field in `package.json` to forward `/api` calls to `http://localhost:3001`.

---

## Next steps (planned improvements)

- Add real domain data model (e.g. `tasks` or `entries` table)
- Implement CRUD endpoints in backend
- Connect frontend UI to these endpoints
- Add GitHub Actions for CI (linting, build)
- Optional: deploy images to AWS (ECR/ECS) or another cloud provider
