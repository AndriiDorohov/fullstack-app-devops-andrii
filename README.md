# Docker Fullstack App – React + Node.js + PostgreSQL + Docker & AWS

Small production-like full-stack project that demonstrates how to:

- Build a React + Node.js + PostgreSQL app
- Containerize services with Docker & Docker Compose
- Push images to Docker Hub
- Run the stack on an AWS EC2 instance
- Wire simple CI with GitHub Actions

The app shows the current time from PostgreSQL and provides a minimal **Tasks** CRUD API + UI.

---

## Features

- **Backend (Node.js + Express + PostgreSQL)**
  - `/` – health check text response
  - `/api` – returns current time from PostgreSQL (`SELECT NOW()`)
  - `/api/tasks`:
    - `GET /api/tasks` – list all tasks
    - `POST /api/tasks` – create a new task (`{ "title": "Buy milk" }`)
    - `PATCH /api/tasks/:id/toggle` – toggle `is_done`
    - `DELETE /api/tasks/:id` – delete a task
  - Connection retry logic on startup (waits for DB before starting API)

- **Database (PostgreSQL)**
  - Uses official `postgres:16` image
  - On first start executes `db/init.sql`, which creates table:

    ```sql
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      is_done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ```

- **Frontend (React + Nginx)**
  - Built with CRA (`react-scripts`)
  - Production build served by `nginx:alpine`
  - UI shows:
    - Time from `/api`
    - Tasks list with:
      - create new task
      - toggle “done / not done”
      - delete task
    - Loading & simple error states

- **Docker & Docker Compose**
  - Separate `Dockerfile` for backend and frontend
  - `docker-compose.yml` – local development stack (builds images from source)
  - `docker-compose.prod.yml` – production stack (pulls images from Docker Hub)
  - PostgreSQL data stored in named volumes (`pgdata`, `pgdata_prod`)

- **CI / CD**
  - **CI workflow**: `.github/workflows/ci.yml`
    - Runs on push to `main`
    - Installs dependencies & builds backend + frontend
  - **Docker images workflow**: `.github/workflows/docker-ci-cd.yml`
    - Builds and pushes:
      - `DOCKERHUB_USERNAME/fullstack-app-backend:latest`
      - `DOCKERHUB_USERNAME/fullstack-app-frontend:latest`
    - Uses GitHub Actions secrets for Docker Hub credentials

- **Deployment on AWS EC2**
  - Clone repo on EC2
  - Fill `.env` from `.env.example`
  - `docker compose -f docker-compose.prod.yml --env-file .env up -d`
  - App is available at `http://<EC2_PUBLIC_IP>:3000`

---

## Tech Stack

- **Frontend**: React, CRA, Nginx
- **Backend**: Node.js 18, Express, `pg`
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker, Docker Compose
- **CI / CD**: GitHub Actions, Docker Hub
- **Cloud**: AWS EC2 (Ubuntu)

---

## Project Structure

```bash
.
├─ backend/
│  ├─ Dockerfile
│  ├─ index.js
│  ├─ package.json
│  └─ package-lock.json
├─ frontend/
│  ├─ Dockerfile
│  ├─ nginx.conf
│  ├─ package.json
│  ├─ package-lock.json
│  └─ src/
│     ├─ App.js
│     └─ App.css
├─ db/
│  └─ init.sql
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     └─ docker-ci-cd.yml
├─ docker-compose.yml
├─ docker-compose.prod.yml
├─ .env.example
└─ README.md
```

---

## Environment variables

All required variables are documented in `.env.example`. Copy it to `.env` and adjust values:

```bash
cp .env.example .env
```

Key variables:

- `POSTGRES_DB` – database name (default: `fullstack_db`)
- `POSTGRES_USER` – DB user (`fullstack_user`)
- `POSTGRES_PASSWORD` – DB password (`fullstack_pass`)
- `BACKEND_PORT` – backend port inside container (`3001`)
- `DATABASE_URL` – used by backend to connect to PostgreSQL:

  ```bash
  DATABASE_URL=postgres://fullstack_user:fullstack_pass@db:5432/fullstack_db
  ```

- `DOCKERHUB_USERNAME` – your Docker Hub username (used in prod Compose + CI/CD)

---

## Running locally with Docker (development)

Requirements:

- Docker
- Docker Compose v2

1. Clone the repository:

   ```bash
   git clone git@github.com:AndriiDorohov/fullstack-app-devops-andrii.git
   cd fullstack-app-devops-andrii
   ```

2. Create `.env` from template:

   ```bash
   cp .env.example .env
   ```

   For local development you can leave defaults from `.env.example`.

3. Start the stack:

   ```bash
   docker compose up --build
   ```

4. Open in browser:

   - Frontend: http://localhost:3000
   - Backend API:
     - http://localhost:3001/api
     - http://localhost:3001/api/tasks

5. Stop the stack:

   ```bash
   docker compose down
   ```

---

## Running production stack with Docker Hub images

This is the same setup that runs on AWS EC2.

### 1. Build and push images to Docker Hub

You can do it manually or via GitHub Actions.

**Manual (local) build & push:**

```bash
# Backend
docker build -t <your_dockerhub_username>/fullstack-app-backend:latest ./backend
docker push <your_dockerhub_username>/fullstack-app-backend:latest

# Frontend
docker build -t <your_dockerhub_username>/fullstack-app-frontend:latest ./frontend
docker push <your_dockerhub_username>/fullstack-app-frontend:latest
```

Make sure `DOCKERHUB_USERNAME` in `.env` matches `<your_dockerhub_username>`.

### 2. Start production stack (locally or on server)

On the target host (e.g. AWS EC2 Ubuntu):

```bash
git clone https://github.com/AndriiDorohov/fullstack-app-devops-andrii.git
cd fullstack-app-devops-andrii

cp .env.example .env
# Edit .env → set DOCKERHUB_USERNAME and, if needed, DB credentials

docker compose -f docker-compose.prod.yml --env-file .env up -d
```

Services:

- Frontend: `http://<HOST_IP>:3000`
- Backend API: `http://<HOST_IP>:3001/api`
- Tasks API: `http://<HOST_IP>:3001/api/tasks`

### 3. Healthchecks & restart policies

`docker-compose.prod.yml` includes:

- `restart: unless-stopped` for all services
- Healthchecks:
  - Backend: `curl -f http://localhost:3001/api`
  - Frontend: `curl -f http://localhost/`

Docker will automatically mark containers unhealthy and restart them if checks fail.

---

## GitHub Actions CI / CD

### CI: build-and-test

Workflow: `.github/workflows/ci.yml`

- Triggers: `push` to `main`
- Jobs:
  - Installs Node.js 18
  - `npm install` in `backend/`
  - `npm install` & `npm run build` in `frontend/`

This ensures the app builds successfully before merging / deploying.

### Docker images: build-and-push

Workflow: `.github/workflows/docker-ci-cd.yml`

- Triggers: `push` to `main` / `workflow_dispatch`
- Steps:
  - Login to Docker Hub using secrets:
    - `DOCKERHUB_USERNAME`
    - `DOCKERHUB_TOKEN` (Docker access token / password)
  - Build and push:
    - `DOCKERHUB_USERNAME/fullstack-app-backend:latest`
    - `DOCKERHUB_USERNAME/fullstack-app-frontend:latest`

To enable this workflow:

1. Go to **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**
2. Add:
   - `DOCKERHUB_USERNAME`
   - `DOCKERHUB_TOKEN`
3. Run workflow from **Actions** tab or push to `main`.

---

## API summary

Base URL (backend):

- Local dev: `http://localhost:3001`
- Production (EC2): `http://<EC2_PUBLIC_IP>:3001`

**Endpoints:**

- `GET /`  
  Health check text message.

- `GET /api`  
  Returns current time from PostgreSQL:

  ```json
  {
    "time": "2025-12-10T18:21:03.000Z"
  }
  ```

- `GET /api/tasks`  
  Returns array of tasks:

  ```json
  [
    {
      "id": 1,
      "title": "Learn Docker",
      "is_done": false,
      "created_at": "2025-12-10T18:00:00.000Z"
    }
  ]
  ```

- `POST /api/tasks`  

  Request body:

  ```json
  { "title": "New task" }
  ```

  Response:

  ```json
  {
    "id": 2,
    "title": "New task",
    "is_done": false,
    "created_at": "2025-12-10T18:05:00.000Z"
  }
  ```

- `PATCH /api/tasks/:id/toggle`  
  Toggles `is_done` flag and returns updated task.

- `DELETE /api/tasks/:id`  
  Deletes a task. Returns `204 No Content` on success.

---

## Notes & possible extensions

- Add authentication (JWT) and per-user tasks
- Add tests (Jest / Supertest) and extend CI pipeline
- Add monitoring (Prometheus + Grafana, Loki, etc.)
- Add staging environment or multi-env Compose configs
- Add Terraform / Ansible for full infra-as-code

---

## License

This project is created for learning and portfolio purposes.
Feel free to use it as a reference for your own full-stack + DevOps setups.
