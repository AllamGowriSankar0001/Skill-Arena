# Skill Arena Backend

Node.js + Express API with MongoDB and bcrypt password hashing.

## Setup

```bash
cd SKILLARENA/backend
npm install
cp .env.example .env
```

Edit `.env` with your MongoDB URI and JWT secret, then start MongoDB locally.

```bash
npm run dev
```

API base: `http://localhost:5000/api`

## Auth endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Current user (Bearer token) |

### Signup body

```json
{ "name": "Ada Arena", "email": "you@example.com", "password": "secret12" }
```

### Login body

```json
{ "email": "you@example.com", "password": "secret12" }
```

Responses include `token` and `user` profile for the dashboard.
