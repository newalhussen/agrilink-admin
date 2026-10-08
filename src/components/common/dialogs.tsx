import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";

/** Confirmation with an optional required reason, used for cancel / reject / suspend style actions. */
export function ReasonDialog({
  open, onOpenChange, title, description, confirmLabel, reasonLabel = "Reason", requireReason = true, tone = "danger",
  pending, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  reasonLabel?: string;
  requireReason?: boolean;
  tone?: "danger" | "primary" | "sage";
  pending?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);
  const invalid = requireReason && reason.trim().length < 3;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <Field label={reasonLabel + (requireReason ? "" : " (optional)")}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Back</Button>
          <Button variant={tone} disabled={invalid || pending} onClick={() => onConfirm(reason.trim())}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel, tone = "primary", pending, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary" | "sage";
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Back</Button>
          <Button variant={tone} disabled={pending} onClick={onConfirm}>{pending ? "Working…" : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
