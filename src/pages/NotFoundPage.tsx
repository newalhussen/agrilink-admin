import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/common/parts";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass className="size-6" />}
      title="That page is off the map"
      hint="The link may be old or mistyped."
      action={<Button asChild><Link to="/">Back to overview</Link></Button>}
    />
  );
}
