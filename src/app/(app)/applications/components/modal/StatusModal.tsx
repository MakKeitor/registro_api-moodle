// src/app/(app)/applications/components/modal/StatusModal.tsx
"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

type Mode = "approved" | "rejected" | "in_review"

type Props = {
  /** Botón o trigger externo que abre el diálogo */
  trigger: React.ReactNode
  /** Modo de la acción */
  mode: Mode
  /** Identificador de la solicitud (para mostrar y/o enviar al backend) */
  applicationId: string
  /** Nombre (para contexto visual) */
  applicantName?: string
  /** Callback que ejecuta la acción final (haz tu fetch aquí). Debe lanzar si falla. */
  onSubmit: (args: {
    id: string
    mode: Mode
    note?: string
  }) => Promise<void> | void
  /** Texto opcional que aparece como descripción superior */
  description?: string
}

const COPY: Record<
  Mode,
  {
    title: string
    step1: string
    step2: { ask: string; token: string; confirmCta: string }
    cta: string
    color: "default" | "destructive" | "secondary"
    needsNote: boolean
  }
> = {
  approved: {
    title: "Aprobar solicitud",
    step1:
      "Vas a aprobar esta solicitud. Asegúrate de haber verificado los datos y documentos necesarios.",
    step2: {
      ask: 'Para confirmar, escribe "APROBAR" en el campo de abajo.',
      token: "APROBAR",
      confirmCta: "Confirmar aprobación",
    },
    cta: "Aprobar",
    color: "default",
    needsNote: false,
  },
  in_review: {
    title: "Marcar como En revisión",
    step1:
      "Moverás la solicitud a estado 'En revisión'. Úsalo cuando está siendo evaluada por el equipo.",
    step2: {
      ask: 'Para confirmar, escribe "REVISAR" en el campo de abajo.',
      token: "REVISAR",
      confirmCta: "Confirmar cambio a En revisión",
    },
    cta: "En revisión",
    color: "secondary",
    needsNote: false,
  },
  rejected: {
    title: "Rechazar solicitud",
    step1:
      "Vas a rechazar esta solicitud. Explica brevemente el motivo; el texto puede mostrarse al solicitante.",
    step2: {
      ask: 'Para confirmar, escribe "RECHAZAR" en el campo de abajo.',
      token: "RECHAZAR",
      confirmCta: "Confirmar rechazo",
    },
    cta: "Rechazar",
    color: "destructive",
    needsNote: true,
  },
}

export function StatusModal({
  trigger,
  mode,
  applicationId,
  applicantName,
  onSubmit,
  description,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<1 | 2>(1)
  const [note, setNote] = React.useState("")
  const [token, setToken] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const cfg = COPY[mode]

  const reset = () => {
    setStep(1)
    setNote("")
    setToken("")
    setLoading(false)
  }

  const handleClose = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const canContinueStep1 = mode === "rejected" ? note.trim().length >= 5 : true // pide mínimo contenido al rechazar

  const canConfirm =
    token.trim().toUpperCase() === cfg.step2.token.toUpperCase() &&
    (!cfg.needsNote || note.trim().length >= 5)

  const submit = async () => {
    try {
      setLoading(true)
      await onSubmit({
        id: applicationId,
        mode,
        note: note.trim() || undefined,
      })
      toast.success(
        mode === "approved"
          ? "Solicitud aprobada exitosamente"
          : mode === "rejected"
          ? "Solicitud rechazada"
          : "Solicitud marcada como en revisión"
      )
      handleClose(false)
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Error al procesar la solicitud"

      // Verificar si es un error de Moodle
      const errorType = (e as { type?: string })?.type
      if (errorType === "MOODLE_ERROR") {
        toast.error("Error al crear usuario en Moodle", {
          description: errorMessage,
          duration: 6000,
        })
      } else {
        toast.error(errorMessage)
      }
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl">{cfg.title}</DialogTitle>
          <DialogDescription className="pt-2">
            {description ??
              `Solicitud ${applicationId}${
                applicantName ? ` — ${applicantName}` : ""
              }`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">{cfg.step1}</p>

            {cfg.needsNote && (
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Motivo del rechazo
                </label>
                <Textarea
                  placeholder="Escribe el motivo…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Recomendación: sé concreto y profesional. Mínimo 5 caracteres.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setStep(2)} disabled={!canContinueStep1}>
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">{cfg.step2.ask}</p>
            <Input
              autoFocus
              placeholder={cfg.step2.token}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono"
            />
            {cfg.needsNote && (
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Motivo del rechazo
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[100px] resize-none"
                  readOnly
                />
              </div>
            )}
            <div className="flex justify-between gap-3 pt-4">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Volver
              </Button>
              <Button
                variant={cfg.color}
                onClick={submit}
                disabled={!canConfirm || loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {cfg.step2.confirmCta}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
