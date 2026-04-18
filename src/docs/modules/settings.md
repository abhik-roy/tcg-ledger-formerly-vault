# Settings Module

## Purpose
Store configuration management. Controls store name, contact email, POS exit PIN, tax rate, and currency. Also handles admin password changes.

## Exported Functions

### Controller (`actions/settings.ts`)
| Function | Auth | Description |
|----------|------|-------------|
| `getStoreSettings()` | Admin | Get current settings |
| `updateStoreSettings(data)` | Admin | Update settings |
| `updateOwnPassword(data)` | Any auth | Change own password |

### Service (`settings.service.ts`)
| Method | Description |
|--------|-------------|
| `getSettings()` | Get settings with defaults fallback |
| `updateSettings(data)` | Upsert settings singleton |
| `updateOwnPassword(userId, currentPassword, newPassword)` | Verify and update |

### Repository (`settings.repository.ts`)
| Method | Description |
|--------|-------------|
| `find()` | Get singleton row |
| `upsert(data)` | Create or update singleton |

## Key Types
- `StoreSettingsData` -- `{ storeName, contactEmail, posExitPin, taxRate, currency }`

## Business Rules
- Settings use a singleton pattern (fixed ID "singleton")
- Defaults are returned if no DB row exists yet
- Password change requires current password verification
- Tax rate is stored as an integer
- Only ADMIN role can access store settings
- Any authenticated user can change their own password
