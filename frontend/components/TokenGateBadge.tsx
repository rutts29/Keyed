import { Lock } from "lucide-react"

import { Badge } from "@/components/ui/badge"

export function TokenGateBadge() {
  return (
    <Badge variant="secondary" className="inline-flex items-center gap-1 text-[10px]">
      <Lock className="h-3 w-3" />
      Token gated
    </Badge>
  )
}
