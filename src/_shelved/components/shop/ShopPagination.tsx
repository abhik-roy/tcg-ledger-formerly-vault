import { ChevronLeft, ChevronRight } from "lucide-react"

interface ShopPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ShopPagination({ page, totalPages, onPageChange }: ShopPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-10 flex items-center justify-center gap-2 pb-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Prev
      </button>
      <span className="text-xs text-muted-foreground px-2">
        <span className="font-semibold text-foreground">{page}</span> / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-3 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
