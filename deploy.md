# Fullstack App – DevOps Deployment Guide

> Simple fullstack app (React + Node.js + PostgreSQL) with Docker, CI, Docker Hub and EC2 deployment.

---

## 1. Architecture Overview

**Stack:**

- **Frontend**: React (Create React App), built into static files and served by **Nginx (alpine)**
- **Backend**: Node.js 18 (Express), REST API:
  - `GET /api` – time from DB
  - `GET /api/tasks` – list of tasks
  - `POST /api/tasks` – create task
- **Database**: PostgreSQL 16
  - init script: `db/init.sql` creates table `tasks`
- **Containers**:
  - `fsapp-frontend` – React + Nginx
  - `fsapp-backend` – Node.js API
  - `fsapp-postgres` – PostgreSQL

**Images on Docker Hub:**

- `andriidorokhov/fullstack-app-backend:latest`
- `andriidorokhov/fullstack-app-frontend:latest`

**Main compose files:**

- `docker-compose.yml` – local development
- `docker-compose.prod.yml` – production (Docker Hub images + restart + healthchecks)

---

## 2. Environment configuration

Config is stored in `.env` (see `.env.example` as template).

Required variables:

```env
POSTGRES_DB=fullstack_db
POSTGRES_USER=fullstack_user
POSTGRES_PASSWORD=your_strong_password

BACKEND_PORT=3001
DATABASE_URL=postgres://fullstack_user:your_strong_password@db:5432/fullstack_db

DOCKERHUB_USERNAME=andriidorokhov
```

> For production: **use a strong password** and keep `.env` outside of VCS.

---

## 3. Local development (without Docker)

### 3.1. Backend

```bash
cd backend
npm install

# Example local DB URL (if postgres is running on localhost)
export DATABASE_URL=postgres://fullstack_user:fullstack_pass@localhost:5432/fullstack_db
export PORT=3001

node index.js
```

The backend will be available at:

- `http://localhost:3001/api`
- `http://localhost:3001/api/tasks`

### 3.2. Frontend (React dev server)

```bash
cd frontend
npm install
npm start
```

By default CRA runs at:

- `http://localhost:3000`
- Proxy to backend is configured via `proxy` in `frontend/package.json`.

---

## 4. Local development with Docker (dev compose)

From project root:

```bash
cd /mnt/data/projects/fullstack-app

# Ensure .env exists
cp .env.example .env   # then edit values if needed

# Start full dev stack (frontend + backend + postgres)
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- API via frontend: `http://localhost:3000/api`

Stop:

```bash
docker compose down
```

---

## 5. Docker images & CI/CD

Images are pushed to **Docker Hub** under:

- `andriidorokhov/fullstack-app-backend:latest`
- `andriidorokhov/fullstack-app-frontend:latest`

CI pipeline (GitHub Actions):

- triggers on `push` to `main`
- builds frontend & backend
- builds Docker images
- logs into Docker Hub using GitHub Secrets
- pushes updated images

> Result: any server with Docker + `docker-compose.prod.yml` + `.env` can pull and run the latest version.

---

## 6. Production deployment on EC2 (Ubuntu)

### 6.1. Prerequisites

- AWS EC2 instance (Ubuntu 22.04)
- Security Group allows:
  - SSH: TCP 22
  - HTTP / app ports: TCP 3000, 3001 (for testing)
- SSH key (`fullstack-app-key.pem`) on local machine.

### 6.2. SSH into server

From local machine:

```bash
ssh -i ~/.ssh/fullstack-app-key.pem ubuntu@SERVER_IP
```

Replace `SERVER_IP` with your EC2 public IPv4 (for example `13.61.16.100`).

---

### 6.3. Install Docker & git (on server)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose git
```

Quick check:

```bash
docker --version
docker-compose version
```

---

### 6.4. Clone repository (on server)

```bash
cd ~
git clone https://github.com/AndriiDorohov/fullstack-app-devops-andrii.git
cd fullstack-app-devops-andrii
```

---

### 6.5. Create `.env` for production (on server)

```bash
cp .env.example .env
nano .env
```

Example production `.env`:

```env
POSTGRES_DB=fullstack_db
POSTGRES_USER=fullstack_user
POSTGRES_PASSWORD=your_strong_prod_password

BACKEND_PORT=3001
DATABASE_URL=postgres://fullstack_user:your_strong_prod_password@db:5432/fullstack_db

DOCKERHUB_USERNAME=andriidorokhov
```

Save and exit.

---

### 6.6. Start production stack (on server)

```bash
cd ~/fullstack-app-devops-andrii

# Optional: pull the latest images from Docker Hub
sudo docker-compose -f docker-compose.prod.yml pull

# Start in background
sudo docker-compose -f docker-compose.prod.yml --env-file .env up -d
```

Check containers:

```bash
sudo docker ps
```

You should see:

- `fsapp-postgres-prod`
- `fsapp-backend-prod`
- `fsapp-frontend-prod`

---

### 6.7. Healthchecks & restart policy

`docker-compose.prod.yml` includes:

- `restart: unless-stopped` – containers restart automatically on server reboot.
- `healthcheck` for backend:

  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:3001/api || exit 1"]
    interval: 30s
    timeout: 5s
    retries: 3
    start_period: 10s
  ```

- `healthcheck` for frontend:

  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost/ || exit 1"]
    interval: 30s
    timeout: 5s
    retries: 3
    start_period: 10s
  ```

Check status:

```bash
sudo docker ps
```

Status may show `(healthy)` once checks pass.

---

### 6.8. Accessing the app from the internet

From local machine (browser):

- Frontend: `http://SERVER_IP:3000`
- API via frontend: `http://SERVER_IP:3000/api`
- Direct backend API: `http://SERVER_IP:3001/api`

Example (current demo):

- `http://13.61.16.100:3000`
- `http://13.61.16.100:3000/api`
- `http://13.61.16.100:3001/api`

---

## 7. Updating production

When changes are pushed to `main` and CI builds new images:

On the server:

```bash
ssh -i ~/.ssh/fullstack-app-key.pem ubuntu@SERVER_IP

cd ~/fullstack-app-devops-andrii

# Update repo (if compose / scripts changed)
git pull

# Pull latest images
sudo docker-compose -f docker-compose.prod.yml pull

# Restart stack with new images
sudo docker-compose -f docker-compose.prod.yml --env-file .env up -d
```

---

## 8. Useful commands

### Logs

```bash
# All services (prod)
sudo docker-compose -f docker-compose.prod.yml logs -f

# Backend only
sudo docker logs -f fsapp-backend-prod

# Frontend only
sudo docker logs -f fsapp-frontend-prod

# Postgres
sudo docker logs -f fsapp-postgres-prod
```

### Database shell inside postgres

```bash
sudo docker exec -it fsapp-postgres-prod psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
```

Then:

```sql
SELECT * FROM tasks;
```

### Stop / remove prod stack

```bash
cd ~/fullstack-app-devops-andrii
sudo docker-compose -f docker-compose.prod.yml down
```

(Volume `pgdata_prod` is preserved; to fully reset DB — delete the volume manually.)

---

This guide describes the full cycle:

- local development,
- Docker-based development,
- CI + Docker Hub,
- production deployment to EC2 with healthchecks and auto-restart.
