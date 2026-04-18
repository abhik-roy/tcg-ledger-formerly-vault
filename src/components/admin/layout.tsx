import { AdminSidebar } from "@/components/admin/AdminSidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <AdminSidebar />
      <div className="pl-[250px]">
        {children}
      </div>
    </div>
  )
}