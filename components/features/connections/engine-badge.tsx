import { Badge } from "@/components/ui/badge";
import { engineLabel } from "@/lib/engines";
import type { Engine } from "@/lib/types";

export function EngineBadge({ engine }: { engine: Engine }) {
  return (
    <Badge variant="outline" className="font-medium text-muted-foreground">
      {engineLabel(engine)}
    </Badge>
  );
}
