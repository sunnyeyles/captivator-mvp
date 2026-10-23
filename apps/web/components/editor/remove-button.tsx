import { Trash2 } from "lucide-react";
import { Button } from "@repo/ui/button";

export function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="justify-self-start text-destructive"
      onClick={onClick}
    >
      <Trash2 />
      {label}
    </Button>
  );
}
