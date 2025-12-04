"use client"

import { parseAxiosError } from "@/lib/api-utils"
// #region Local API
import { apiLocal } from "@/services/axiosLocal"
import type {
  ApplicationDetail,
  ApplicationStatus,
} from "@/app/(app)/applications/components/types"
import type {
  ApplicationsListResponseDTO,
  ApplicationsMetricsResponseDTO,
} from "./applications.dto"

export const ApplicationsApi = {
  list: async (): Promise<ApplicationDetail[]> => {
    try {
      const res = await apiLocal.get<ApplicationsListResponseDTO>(
        "/applications"
      )

      // Validación defensiva por si el backend cambia algo raro
      if (!res.data?.ok || !Array.isArray(res.data.data)) {
        throw new Error("Unexpected applications response shape")
      }

      return res.data.data
    } catch (error: unknown) {
      // No filtramos detalles internos al UI, solo propagamos algo controlado
      const { status, message } = parseAxiosError(error)

      // Podrías mapear ciertos códigos a errores específicos (401 → no auth, etc.)
      throw new Error(
        `Error al obtener solicitudes (${status ?? "?"}): ${
          message || "Error inesperado"
        }`
      )
    }
  },

  updateStatus: async ({
    id,
    status,
    note,
  }: {
    id: string
    status: string
    note?: string
  }): Promise<{ ok: boolean; message?: string }> => {
    try {
      const res = await apiLocal.patch<{
        ok: boolean
        data?: { message: string }
        error?: {
          type: string
          code: string
          message: string
          userMessage?: string
        }
      }>(`/applications/${id}/status`, {
        status,
        note,
      })

      return { ok: true, message: res.data?.data?.message }
    } catch (error: unknown) {
      // Intentar extraer el error estructurado del backend
      const axiosError = error as {
        response?: {
          data?: {
            ok: boolean
            error?: {
              type: string
              code: string
              message: string
              userMessage?: string
            }
          }
        }
      }

      const backendError = axiosError?.response?.data?.error

      if (backendError) {
        // Error estructurado de Moodle u otro error del backend
        const errorMessage = backendError.userMessage || backendError.message
        const errorWithType = new Error(errorMessage) as Error & {
          type: string
          code: string
        }
        errorWithType.type = backendError.type
        errorWithType.code = backendError.code
        throw errorWithType
      }

      // Error genérico
      const { status: errorStatus, message } = parseAxiosError(error)
      throw new Error(
        `Error al actualizar estado (${errorStatus ?? "?"}): ${
          message || "Error inesperado"
        }`
      )
    }
  },
  metrics: async (): Promise<{
    totalApplications: number
    applicationsByStatus: Record<ApplicationStatus, number>
  }> => {
    try {
      const res = await apiLocal.get<ApplicationsMetricsResponseDTO>(
        "/applications/metrics"
      )

      if (!res.data?.ok || !res.data.data) {
        throw new Error("Unexpected applications metrics response shape")
      }

      return res.data.data
    } catch (error: unknown) {
      const { status, message } = parseAxiosError(error)

      throw new Error(
        `Error al obtener métricas (${status ?? "?"}): ${
          message || "Error inesperado"
        }`
      )
    }
  },
}
