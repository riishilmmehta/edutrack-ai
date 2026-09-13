# EDUTrack AI Pro — Backend

Express API backed by MySQL (relational/academic data) and MongoDB (notifications,
activity logs). Built to sit behind Apache or be deployed to Railway/Render.

## 1. Install dependencies
```bash
npm install
```

## 2. Set up environment variables
```bash
cp .env.example .env
```
Fill in `.env` with your real MySQL credentials, MongoDB URI, and a strong
`JWT_SECRET`. **Never commit `.env` to GitHub** — it's already in `.gitignore`.

## 3. Set up the database
Run the schema and seed files against your MySQL instance:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```
Make sure MongoDB is running locally, or point `MONGO_URI` in `.env` to a hosted
instance (e.g. MongoDB Atlas free tier).

## 4. Run the server
```bash
npm run dev     # with auto-restart (nodemon)
# or
npm start        # plain node
```
Visit `http://localhost:3000/api/health` — you should see:
```json
{ "success": true, "message": "EDUTrack backend is running" }
```

## API Endpoints (so far)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | none | Log in, returns a JWT |
| POST | `/api/auth/register` | none | Public self-service registration → status `PENDING` |
| POST | `/api/auth/register/admin` | Admin JWT | Admin-created account → status `ACTIVE` |
| GET | `/api/notifications` | JWT | Get the logged-in user's notification feed |
| PATCH | `/api/notifications/:id/read` | JWT | Mark a notification as read |

All protected routes expect `Authorization: Bearer <token>`.

## Folder structure
```
edutrack-server/
├── config/          # MySQL & MongoDB connection setup
├── controllers/      # Business logic (auth, etc.)
├── middleware/        # JWT auth + role guard
├── models/            # MongoDB schemas
├── routes/            # Express route definitions
├── utils/             # GR number generation, audit logging, etc.
├── database/           # schema.sql, seed.sql (run once against MySQL)
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

## Still to build
- Grades, attendance, fees routes (schema already supports these — controllers not
  yet written)
- Real email sending on registration/notifications (currently only writes to the
  MongoDB `notifications` collection — no email provider wired in yet)
- Password reset flow
- Admin approval endpoint for `PENDING` self-registered accounts
