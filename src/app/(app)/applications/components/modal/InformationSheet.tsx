"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusModal } from "./StatusModal"
import { PDFViewer } from "@/components/reusable/PDFViewer"
import { FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { usePdfFile } from "@/features/api/files/usePdfFile"
import { ApplicationsApi } from "@/features/api/applications/applications.client"
import { fullName, maskDPI, formatDate, getFileLabel } from "../../lib"

import type { ApplicationDetail, ApplicationRow, FileInfo } from "../types"

// --- Helpers de presentación ---
function Field({
  label,
  value,
  className,
}: {
  label: string
  value?: string | number | null
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs">{label}</Label>
      <Input value={value ?? "—"} disabled readOnly />
    </div>
  )
}

function StatusBadge({ status }: { status: ApplicationRow["status"] }) {
  const map: Record<ApplicationRow["status"], { label: string }> = {
    pending: { label: "Pendiente" },
    in_review: { label: "En revisión" },
    approved: { label: "Aprobado" },
    rejected: { label: "Rechazado" },
  }
  return <Badge variant="secondary">{map[status].label}</Badge>
}

// Componente para mostrar PDF usando el hook
function PdfViewerWrapper({ fileId }: { fileId: string }) {
  const { pdfUrl, loading, error } = usePdfFile(fileId)

  if (loading) {
    return <div className="flex items-center justify-center h-full">Cargando PDF...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>
  }

  if (!pdfUrl) {
    return <div className="flex items-center justify-center h-full">No se pudo cargar el PDF</div>
  }

  return <PDFViewer url={pdfUrl} className="w-full h-full" />
}

// --- Componente principal ---
export function InformationSheet({
  trigger,
  data,
  title = "Ficha del solicitante",
  description = "Revisión completa de la información provista en el registro.",
}: {
  trigger: React.ReactNode
  data: ApplicationDetail
  title?: string
  description?: string
}) {
  // Filtrar solo archivos PDF
  const pdfFiles = React.useMemo(() => {
    if (!data.files || !Array.isArray(data.files)) return []
    return data.files.filter(file =>
      file.mimeType === 'application/pdf' ||
      file.path.toLowerCase().endsWith('.pdf')
    )
  }, [data.files])

  const hasPdfFiles = pdfFiles.length > 0
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent className="w-[900px] max-w-[1600px] overflow-y-auto p-6">
        <SheetHeader className="p-0">
          <SheetTitle className="flex items-center gap-2">
            {title}
            <StatusBadge status={data.status} />
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Identificación */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Identificación
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <Field label="ID de solicitud" value={data.id} />
              <Field label="Nombre completo" value={fullName(data)} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Email" value={data.email} />
                <Field label="DPI" value={maskDPI(data.dpi)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Estado" value={data.status} />
                <Field
                  label="Fecha de solicitud"
                  value={formatDate(data.submittedAt)}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Afiliaciones / Laboral */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Afiliaciones y vínculo laboral
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Entidad" value={data.entidad} />
              <Field label="Institución" value={data.institucion} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Dependencia" value={data.dependencia} />
                <Field label="Renglón presupuestario" value={data.renglon} />
              </div>
              <Field label="Colegio profesional" value={data.colegio} />
            </div>
          </section>

          <Separator />

          {/* Demografía / Contacto (opcionales) */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Demografía y contacto
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Etnia" value={data.etnia} />
              <Field label="Teléfono" value={data.telefono} />
            </div>
            <Field label="Dirección" value={data.direccion} />
          </section>

          {/* Documentos adjuntos */}
          {hasPdfFiles && (
            <>
              <Separator />
              <section>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  Documentos adjuntos
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {pdfFiles.map((file, index) => (
                    <Dialog key={file.id}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-auto flex-col gap-2 p-4"
                        >
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <span className="text-xs font-medium">
                            {getFileLabel(file.path, index)}
                          </span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[98vw] max-w-none max-h-[96vh] h-[96vh] flex flex-col p-0">
                        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
                          <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {getFileLabel(file.path, index)}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 px-6 pb-6 min-h-0">
                          <PdfViewerWrapper fileId={file.id} />
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <StatusModal
            mode="in_review"
            applicationId={data.id}
            applicantName={fullName(data)}
            onSubmit={async ({ id, mode, note }) => {
              await ApplicationsApi.updateStatus({ id, status: mode, note })
              // Delay para mostrar el toast antes de refrescar
              setTimeout(() => window.location.reload(), 1500)
            }}
            trigger={<Button variant="secondary">En revisión</Button>}
          />

          <StatusModal
            mode="rejected"
            applicationId={data.id}
            applicantName={fullName(data)}
            onSubmit={async ({ id, mode, note }) => {
              await ApplicationsApi.updateStatus({ id, status: mode, note })
              setTimeout(() => window.location.reload(), 1500)
            }}
            trigger={<Button variant="destructive">Rechazar</Button>}
          />

          <StatusModal
            mode="approved"
            applicationId={data.id}
            applicantName={fullName(data)}
            onSubmit={async ({ id, mode, note }) => {
              await ApplicationsApi.updateStatus({ id, status: mode, note })
              setTimeout(() => window.location.reload(), 1500)
            }}
            trigger={<Button>Aprobar</Button>}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
