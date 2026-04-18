"use client"

import { useState } from "react"
import { SearchPanel } from "@/components/admin/add-cards/SearchPanel"
import { BulkUploadPanel } from "@/components/admin/add-cards/BulkUploadPanel"

export default function AddCardsPage() {
  const [activeTab, setActiveTab] = useState<"search" | "upload">("search")

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="py-2 sm:h-12 px-4 sm:px-5 border-b border-border bg-card flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-foreground">Add Cards</h1>
          <span className="text-muted-foreground/30 text-xs hidden sm:inline">|</span>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Search the catalog or bulk-import via CSV
          </p>
        </div>

        <div className="flex bg-muted/50 p-0.5 rounded-md border border-border">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-3 py-2 sm:py-1.5 rounded text-xs font-medium transition-all min-h-[36px] sm:min-h-0 ${
              activeTab === "search"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Single Search
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-2 sm:py-1.5 rounded text-xs font-medium transition-all min-h-[36px] sm:min-h-0 ${
              activeTab === "upload"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Bulk Upload
          </button>
        </div>
      </div>

      {/* Panel */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "search" ? <SearchPanel /> : <BulkUploadPanel />}
      </div>
    </div>
  )
}
