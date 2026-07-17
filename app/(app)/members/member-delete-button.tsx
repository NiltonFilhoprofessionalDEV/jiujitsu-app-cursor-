"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteMember,
  type MemberActionState,
} from "@/actions/members";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const initialState: MemberActionState = null;

export function MemberDeleteButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteMember,
    initialState,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      setOpen(false);
      router.push("/members");
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        className="h-11 w-full"
        onClick={() => setOpen(true)}
      >
        Apagar membro
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-5 bg-popover p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apagar membro?</DialogTitle>
            <DialogDescription>
              Remover <strong>{memberName}</strong> da academia? Se houver
              histórico de presença, o cadastro será só inativado.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid grid-cols-2 gap-2">
            <input type="hidden" name="id" value={memberId} />
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="h-11"
              disabled={pending}
            >
              {pending ? "Apagando…" : "Apagar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
