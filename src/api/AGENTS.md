# API - REST Routes

## OVERVIEW
Express router with Zod validation. Auth via `x-user-id` header.

## KEY FILES
- `src/api/routes/polls.ts` - All poll CRUD + start/end/import
- `src/api/middleware/auth.ts` - Whitelist check

## ENDPOINTS
| Method | Path | Auth |
|--------|------|------|
| GET | /polls | read |
| POST | /polls | write |
| GET | /polls/:id | read |
| PUT | /polls/:id | write |
| DELETE | /polls/:id | write |
| POST | /polls/:id/start | write |
| POST | /polls/:id/end | write |
| POST | /polls/:id/import | write |

## VALIDATION
Zod v3 schemas. `CreatePollSchema`, `UpdatePollSchema`, `OptionInputSchema`.
