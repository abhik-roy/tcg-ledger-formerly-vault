"use client"

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  cardName: string
}

export function QRCodeModal({ isOpen, onClose, cardName }: QRCodeModalProps) {
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin)
    }
  }, [])

  const shopUrl = origin ? `${origin}/shop?q=${encodeURIComponent(cardName)}` : ""
  const adminUrl = origin ? `${origin}/admin/inventory?q=${encodeURIComponent(cardName)}` : ""

  function handlePrint() {
    window.print()
  }

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > #__next { display: none !important; }
          [data-slot="dialog-content"] {
            display: flex !important;
            position: static !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          [data-slot="dialog-overlay"] { display: none !important; }
          .qr-print-hide { display: none !important; }
          .qr-print-section {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold truncate">
              QR Codes — {cardName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-6 justify-center py-4">
            {/* Shop QR */}
            <div className="qr-print-section flex flex-col items-center gap-3">
              <div className="p-4 bg-white rounded-lg border border-border shadow-sm">
                {shopUrl ? (
                  <QRCodeSVG
                    value={shopUrl}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center bg-muted rounded text-muted-foreground text-xs">
                    Loading…
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Shop</p>
                <p className="text-xs text-muted-foreground mt-0.5">Customer storefront</p>
              </div>
            </div>

            {/* Admin QR */}
            <div className="qr-print-section flex flex-col items-center gap-3">
              <div className="p-4 bg-white rounded-lg border border-border shadow-sm">
                {adminUrl ? (
                  <QRCodeSVG
                    value={adminUrl}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center bg-muted rounded text-muted-foreground text-xs">
                    Loading…
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Admin</p>
                <p className="text-xs text-muted-foreground mt-0.5">Inventory lookup</p>
              </div>
            </div>
          </div>

          <div className="qr-print-hide flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
