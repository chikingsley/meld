import { useState } from "react"
import { Button } from "@/components/ui/button"

export function PlanToggle() {
  const [isPaid, setIsPaid] = useState(false)

  return (
    <Button
      variant="outline"
      className={`w-full ${isPaid ? "bg-primary text-primary-foreground" : ""}`}
      onClick={() => setIsPaid(!isPaid)}
    >
      {isPaid ? "Paid Plan" : "Free Plan"}
    </Button>
  )
}