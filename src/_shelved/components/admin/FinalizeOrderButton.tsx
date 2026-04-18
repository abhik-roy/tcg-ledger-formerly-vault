"use client"

import { useState } from "react"
import { fulfillOrderAction } from "@/app/actions/order"
import { Check, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function FinalizeOrderButton({ orderId }: { orderId: string }) {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  const handleFinalize = async () => {
    setIsPending(true)
    const res = await fulfillOrderAction(orderId)

    if (res.success) {
      router.refresh()
    } else {
      toast.error("Error finalizing order: " + res.error)
    }
    setIsPending(false)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={isPending}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Complete Sale
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete this sale?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the order as paid and completed. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleFinalize}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
