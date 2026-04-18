"use client"

import { Fragment, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import { deleteTeamMember } from "@/app/actions/team"
import { InviteUserModal } from "./InviteUserModal"
import { EditUserModal } from "./EditUserModal"
import type { TeamMemberDTO } from "@/lib/dtos"

interface TeamClientProps {
  members: TeamMemberDTO[]
  currentUserId: string
}

const PERM_LABELS: Record<string, string> = {
  inventoryUpdatePrices: "Prices",
  addCardsAccess: "Add Cards",
}

function PermissionsSummary({ member }: { member: TeamMemberDTO }) {
  if (member.role === "ADMIN") {
    return <span className="text-xs text-muted-foreground">Full Access</span>
  }
  if (!member.permissions) {
    return <span className="text-xs text-muted-foreground">{"\u2014"}</span>
  }
  const active = Object.entries(member.permissions)
    .filter(([, v]) => v)
    .map(([k]) => PERM_LABELS[k] ?? k)
  if (active.length === 0) {
    return <span className="text-xs text-muted-foreground">No permissions</span>
  }
  return <span className="text-xs text-foreground/80">{active.join(" \u00B7 ")}</span>
}

function RoleBadge({ role }: { role: string }) {
  if (role === "ADMIN") {
    return (
      <span className="bg-primary/10 text-primary border border-primary/20 text-label font-bold px-2 py-0.5 rounded-full">
        ADMIN
      </span>
    )
  }
  return (
    <span className="bg-warning/10 text-warning border border-warning/30 text-label font-bold px-2 py-0.5 rounded-full">
      USER
    </span>
  )
}

function getInitials(name: string | null, email: string | null): string {
  const source = name || email || "?"
  return source
    .split(/[@ ]/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function TeamClient({ members: initialMembers, currentUserId }: TeamClientProps) {
  const router = useRouter()
  const [members, setMembers] = useState<TeamMemberDTO[]>(initialMembers)
  const [search, setSearch] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editMember, setEditMember] = useState<TeamMemberDTO | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = members.filter((m) => {
    const q = search.toLowerCase()
    return (
      (m.name?.toLowerCase().includes(q) ?? false) || (m.email?.toLowerCase().includes(q) ?? false)
    )
  })

  const totalAdmins = members.filter((m) => m.role === "ADMIN").length
  const totalUsers = members.filter((m) => m.role === "USER").length

  function handleInviteSuccess() {
    setInviteOpen(false)
    router.refresh()
  }

  function handleEditSuccess(updated: TeamMemberDTO) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    setEditMember(null)
  }

  function handleDeleteConfirm(id: string) {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteTeamMember(id)
      if (result.success) {
        setMembers((prev) => prev.filter((m) => m.id !== id))
        setConfirmDeleteId(null)
      } else {
        setDeleteError(result.error || "Failed to delete member")
      }
    })
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Stats bar */}
      <div className="h-14 border-b border-border flex items-center gap-4 sm:gap-6 px-4 sm:px-6 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{members.length}</span>
          <span className="text-xs text-muted-foreground">Members</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">{totalAdmins}</span>
          <span className="text-xs text-muted-foreground">Admins</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-warning">{totalUsers}</span>
          <span className="text-xs text-muted-foreground">Users</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="py-2 sm:h-12 border-b border-border flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-6 shrink-0">
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] max-w-sm bg-muted/40 border border-border rounded-md px-3 h-10 sm:h-9 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:bg-card transition-colors"
        />
        <div className="ml-auto">
          <button
            onClick={() => setInviteOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 sm:h-9 px-4 rounded-md text-sm font-medium transition-colors min-w-[44px]"
          >
            + Invite Member
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="sticky top-0 bg-background border-b border-border z-10">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Member
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Permissions
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Joined
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
              <Fragment key={member.id}>
                <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {getInitials(member.name, member.email)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-body">
                          {member.name || (
                            <span className="text-muted-foreground italic">No name</span>
                          )}
                          {member.id === currentUserId && (
                            <span className="ml-2 text-caption text-muted-foreground font-normal">
                              (you)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <PermissionsSummary member={member} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(member.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditMember(member)}
                        title="Edit member"
                        className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDeleteId(member.id === confirmDeleteId ? null : member.id)
                          setDeleteError(null)
                        }}
                        title="Delete member"
                        disabled={member.id === currentUserId}
                        className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>

                {confirmDeleteId === member.id && (
                  <tr
                    key={`${member.id}-confirm`}
                    className="bg-destructive/5 border-b border-destructive/20"
                  >
                    <td colSpan={5} className="px-6 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-foreground">
                          Remove <strong>{member.name || member.email}</strong> from the team?
                        </span>
                        {deleteError && (
                          <span className="text-xs text-destructive">{deleteError}</span>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => {
                              setConfirmDeleteId(null)
                              setDeleteError(null)
                            }}
                            className="border border-border hover:bg-muted/50 h-7 px-3 rounded-md text-xs text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteConfirm(member.id)}
                            disabled={isPending}
                            className="bg-destructive hover:bg-destructive/90 text-white h-7 px-3 rounded-md text-xs font-medium transition-colors disabled:opacity-60"
                          >
                            {isPending ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-sm">
                  {search ? "No members match your search." : "No team members yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {inviteOpen && (
        <InviteUserModal onClose={() => setInviteOpen(false)} onSuccess={handleInviteSuccess} />
      )}
      {editMember && (
        <EditUserModal
          member={editMember}
          currentUserId={currentUserId}
          onClose={() => setEditMember(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}
