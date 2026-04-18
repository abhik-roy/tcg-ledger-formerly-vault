# Team Module

## Purpose
Admin and team member account management. Supports inviting new members, updating roles and permissions, password resets, and account deletion.

## Exported Functions

### Controller (`actions/team.ts`)
| Function | Auth | Description |
|----------|------|-------------|
| `getTeamMembers()` | Admin | List all team members |
| `inviteTeamMember(data)` | Admin | Create new member |
| `updateTeamMember(data)` | Admin | Update name/role/permissions |
| `deleteTeamMember(id)` | Admin | Delete member |
| `resetTeamMemberPassword(data)` | Admin | Reset member password |

### Service (`team.service.ts`)
| Method | Description |
|--------|-------------|
| `getMembers()` | List with permission mapping |
| `invite(data)` | Create with bcrypt hashing |
| `update(data, currentUserId)` | Update with self-demotion guard |
| `delete(id, currentUserId)` | Delete with self-deletion guard |
| `resetPassword(id, newPassword)` | Hash and update password |

### Repository (`team.repository.ts`)
| Method | Description |
|--------|-------------|
| `findAll()` | All users with permissions |
| `findByEmail(email)` | Duplicate check |
| `findById(id)` | Password verification |
| `create(data)` | Create user + optional permissions |
| `update(id, data)` | Update name/role |
| `updatePassword(id, hashedPassword)` | Update password |
| `delete(id)` | Delete user (cascade permissions) |
| `upsertPermissions(userId, permissions)` | Create or update permissions |
| `deletePermissions(userId)` | Remove permissions row |

## Key Types
- `TeamMember` -- `{ id, name, email, role, createdAt, permissions }`
- `UserPermissionsInput` -- 7 boolean flags
- `InviteTeamMemberInput` -- `{ name, email, password, role, permissions? }`
- `UpdateTeamMemberInput` -- `{ id, name, role, permissions? }`

## Business Rules
- Only ADMIN role can manage team members
- Cannot demote yourself (self-demotion guard)
- Cannot delete your own account (self-deletion guard)
- Duplicate emails are rejected
- Passwords are hashed with bcrypt (cost factor 10)
- TEAM members get default permissions if none specified
- ADMIN members don't need a permissions row (permissions row is deleted on promotion to ADMIN)
