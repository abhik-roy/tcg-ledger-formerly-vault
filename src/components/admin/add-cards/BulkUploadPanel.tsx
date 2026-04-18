"use client"

import { useState } from "react"
import Image from "next/image"
import Papa from "papaparse"
import { toast } from "sonner"
import { Loader2, Upload, X, CheckCircle, Save, AlertCircle, RefreshCw } from "lucide-react"
import { identifyCardAction, addCardToCollection } from "@/app/actions/import-helpers"
import { useRouter } from "next/navigation"

type ParsedCard = {
  originalName: string
  quantity: number
  condition: string
  foil: boolean
  scryfallId?: string
  name: string
  set: string
  setName: string
  collectorNumber: string
  rarity: string
  game: string
  image?: string | null
  price: number
  availableVersions?: {
    set: string
    setName: string
    id: string
    price: number
    image?: string | null
  }[]
  isResolving?: boolean
}

export function BulkUploadPanel() {
  const router = useRouter()
  const [csvData, setCsvData] = useState<ParsedCard[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const resolveRow = async (index: number, name: string, setHint?: string) => {
    setCsvData((prev) => {
      const copy = [...prev]
      if (copy[index]) copy[index].isResolving = true
      return copy
    })
    const match = await identifyCardAction(name, setHint)
    setCsvData((prev) => {
      const copy = [...prev]
      if (!copy[index]) return prev
      const row = copy[index]
      row.isResolving = false
      if (match) {
        row.scryfallId = match.id
        row.name = match.name
        row.set = match.set
        row.setName = match.setName
        row.collectorNumber = match.collectorNumber
        row.image = match.image
        row.availableVersions = match.versions
        if (!row.price || row.price === 0) row.price = match.price
      }
      return copy
    })
  }

  const handleFile = async (file: File) => {
    setIsProcessing(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const csvContent = event.target?.result as string
      const lines = csvContent.split(/\r?\n/)
      const headerIndex = lines.findIndex(
        (line) => line.toLowerCase().includes("card name") || line.toLowerCase().includes("name")
      )
      if (headerIndex === -1) {
        toast.error("Invalid CSV: could not find a 'Card Name' column.")
        setIsProcessing(false)
        return
      }
      const cleanCsv = lines.slice(headerIndex).join("\n")
      Papa.parse(cleanCsv, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const initialRows: ParsedCard[] = (results.data as any[])
            .map((row) => {
              const findVal = (keys: string[]) => {
                const k = Object.keys(row).find((k) => keys.includes(k.toLowerCase().trim()))
                return k ? row[k] : ""
              }
              const name = findVal(["card name", "name", "title"])
              if (!name) return null
              return {
                originalName: name,
                name,
                set: findVal(["set code", "set", "code", "edition"]) || "",
                setName: "",
                collectorNumber: findVal(["collector #", "collector number", "number"]) || "",
                rarity: "",
                game: "mtg",
                quantity: parseInt(findVal(["qty", "quantity", "count", "add qty"])) || 1,
                condition: findVal(["condition", "cond"]) || "NM",
                foil: ["true", "yes", "foil"].includes(
                  String(findVal(["foil", "is foil"])).toLowerCase()
                ),
                price: parseFloat(findVal(["price", "market price", "tcg market price"])) || 0,
                isResolving: true,
              } as ParsedCard
            })
            .filter(Boolean) as ParsedCard[]

          if (initialRows.length === 0) {
            toast.error("No valid items found in CSV")
            setIsProcessing(false)
            return
          }

          setCsvData(initialRows)
          setIsProcessing(false)
          setIsResolving(true)
          toast.message(`Resolving ${initialRows.length} items...`)
          for (let i = 0; i < initialRows.length; i++) {
            await resolveRow(i, initialRows[i].name, initialRows[i].set)
          }
          setIsResolving(false)
          toast.success("All cards identified!")
        },
        error: () => {
          toast.error("Failed to parse CSV")
          setIsProcessing(false)
        },
      })
    }
    reader.readAsText(file)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateRow = (index: number, field: keyof ParsedCard, value: any) => {
    setCsvData((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleVersionChange = (index: number, newSetCode: string) => {
    const version = csvData[index].availableVersions?.find((v) => v.set === newSetCode)
    if (!version) return
    setCsvData((prev) => {
      const copy = [...prev]
      copy[index] = {
        ...copy[index],
        set: version.set,
        setName: version.setName,
        scryfallId: version.id,
        image: version.image,
        price: version.price > 0 && copy[index].price === 0 ? version.price : copy[index].price,
      }
      return copy
    })
  }

  const handleSubmitBulk = async () => {
    setIsProcessing(true)
    let successCount = 0
    let failCount = 0

    for (const row of csvData) {
      if (!row.scryfallId) {
        failCount++
        continue
      }
      try {
        const result = await addCardToCollection(
          {
            name: row.name,
            set: row.set,
            setName: row.setName || row.set,
            collectorNumber: row.collectorNumber || "",
            finish: row.foil ? "foil" : "nonfoil",
            game: row.game || "mtg",
            rarity: row.rarity || "unknown",
            imageSmall: row.image,
            imageNormal: row.image,
            scryfallId: row.scryfallId,
            marketPrice: row.price ? Math.round(row.price * 100) : null,
          },
          {
            quantity: row.quantity,
            condition: row.condition,
          }
        )
        if (result.success) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    setIsProcessing(false)
    if (successCount > 0) {
      toast.success(`Added ${successCount} cards to collection`)
      setCsvData([])
      router.refresh()
    }
    if (failCount > 0) {
      toast.error(`${failCount} items failed`)
    }
  }

  const matchedCount = csvData.filter((x) => x.scryfallId).length

  // -- Dropzone --
  if (csvData.length === 0) {
    return (
      <div
        className={`h-full flex flex-col items-center justify-center text-center p-8 transition-colors ${
          dragActive ? "bg-primary/5" : "bg-background"
        }`}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragActive(false)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
        }}
      >
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 border-2 transition-colors ${
            dragActive ? "border-primary bg-primary/10" : "border-border bg-muted/50"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <Upload
              className={`w-6 h-6 ${dragActive ? "text-primary" : "text-muted-foreground/50"}`}
            />
          )}
        </div>

        <p className="text-sm font-semibold text-foreground mb-1">
          {isProcessing ? "Parsing CSV..." : "Drop your CSV here"}
        </p>
        <p className="text-xs text-muted-foreground mb-6 max-w-xs">
          Supports Crystal Commerce, TCGPlayer, and generic exports. Images and prices fetched
          automatically.
        </p>

        <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          Browse Files
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>

        <p className="text-label text-muted-foreground/50 mt-4">
          Required column: <span className="font-mono">Card Name</span>. Optional: Qty, Condition,
          Foil, Price, Set Code.
        </p>
      </div>
    )
  }

  // -- Workspace --
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Workspace toolbar */}
      <div className="h-12 px-4 border-b border-border bg-card flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center border ${
              isResolving
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-success/10 border-success/20 text-success"
            }`}
          >
            {isResolving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground leading-none">
              {isResolving ? "Identifying cards..." : "Review & confirm"}
            </p>
            <p className="text-label text-muted-foreground mt-0.5">
              {matchedCount}/{csvData.length} matched
              {!isResolving && matchedCount < csvData.length && (
                <span className="text-warning ml-1">
                  * {csvData.length - matchedCount} unmatched
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCsvData([])}
            className="h-7 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md border border-border transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSubmitBulk}
            disabled={isProcessing || isResolving}
            className="h-7 px-3 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save to Collection
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 text-label font-bold text-muted-foreground uppercase tracking-wider w-[52px]">
                Img
              </th>
              <th className="px-3 py-2.5 text-label font-bold text-muted-foreground uppercase tracking-wider w-[60px]">
                Qty
              </th>
              <th className="px-3 py-2.5 text-label font-bold text-muted-foreground uppercase tracking-wider">
                Card
              </th>
              <th className="px-3 py-2.5 text-label font-bold text-muted-foreground uppercase tracking-wider w-[140px]">
                Set / Version
              </th>
              <th className="px-3 py-2.5 text-label font-bold text-muted-foreground uppercase tracking-wider w-[100px]">
                Condition
              </th>
              <th className="px-3 py-2.5 text-label font-bold text-muted-foreground uppercase tracking-wider w-[56px] text-center">
                Foil
              </th>
              <th className="px-3 py-2.5 w-[40px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {csvData.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors group">
                <td className="px-3 py-2">
                  <div className="w-9 h-[52px] bg-muted rounded border border-border overflow-hidden relative shrink-0">
                    {row.image ? (
                      <Image
                        src={row.image}
                        alt={row.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {row.isResolving ? (
                          <Loader2 className="w-3.5 h-3.5 text-muted-foreground/40 animate-spin" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-destructive/40" />
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) => updateRow(i, "quantity", parseInt(e.target.value) || 0)}
                    className="w-14 h-7 px-2 text-xs bg-muted/40 border border-border rounded text-foreground focus:outline-none focus:border-primary/50 transition-colors text-center"
                  />
                </td>
                <td className="px-3 py-2">
                  <p className="text-body font-medium text-foreground leading-snug">{row.name}</p>
                  {!row.scryfallId && !row.isResolving && (
                    <p className="text-caption text-destructive mt-0.5">Not matched</p>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.isResolving ? (
                    <div className="h-7 w-24 bg-muted/60 animate-pulse rounded" />
                  ) : (
                    <select
                      value={row.set}
                      onChange={(e) => handleVersionChange(i, e.target.value)}
                      className="w-full h-7 px-2 text-xs bg-muted/40 border border-border rounded text-foreground focus:outline-none focus:border-primary/50 transition-colors uppercase"
                    >
                      <option value={row.set}>{row.set}</option>
                      {row.availableVersions?.map((v) => (
                        <option key={v.id} value={v.set}>
                          {v.set}
                          {v.price > 0 ? ` * $${v.price}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.condition}
                    onChange={(e) => updateRow(i, "condition", e.target.value)}
                    className="w-full h-7 px-2 text-xs bg-muted/40 border border-border rounded text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    <option value="NM">NM</option>
                    <option value="LP">LP</option>
                    <option value="MP">MP</option>
                    <option value="HP">HP</option>
                    <option value="DMG">DMG</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={row.foil}
                    onChange={(e) => updateRow(i, "foil", e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border accent-primary"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setCsvData((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-1 text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="h-9 border-t border-border bg-card flex items-center px-4 shrink-0">
        <p className="text-label text-muted-foreground/50">
          Review set versions before saving. Unmatched cards will be skipped.
        </p>
      </div>
    </div>
  )
}
