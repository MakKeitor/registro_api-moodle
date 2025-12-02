"use client"

import axios from "axios"
import { isAxiosError, parseAxiosError } from "@/lib/api-utils"
// #region Local API
import { apiLocal } from "@/services/axiosLocal"
import type { LoginDTO, LoginResponse, MeResponse } from "./auth.dto"
// #endregion

import type {
  ISigninResponseDTO,
  ISignupPreFillResponseDTO,
  ISignupCompleteResponseDTO,
  IUserListResponseDTO,
  IUserDetailResponseDTO,
} from "../../api/types"
import type {
  SigninSchema,
  SignupPreFillSchema,
  SignupAllSchema,
} from "@/features/auth/schemas/auth.schema"
import type { z } from "zod"

// #region Local API
// Cliente para autenticación LOCAL (tu backend)
export const LocalAuthApi = {
  login: (data: LoginDTO) =>
    apiLocal.post<LoginResponse>("/admin/login", data).then((r) => r.data),

  me: () => apiLocal.get<MeResponse>("/admin/me").then((r) => r.data),

  logout: () =>
    apiLocal.post<{ ok: boolean }>("/admin/logout").then((r) => r.data),

  // common endpoints
  meAny: () => apiLocal.get<MeResponse>("/me").then((r) => r.data),
}

// API externa eliminada - ahora todo pasa por el backend

/**
 * Prefill - Consulta datos de usuario por DPI usando el backend
 * El backend se encarga de autenticarse con la API externa de CGC
 */
export const prefill = async (
  data: z.infer<typeof SignupPreFillSchema>
): Promise<ISignupPreFillResponseDTO> => {
  try {
    // Llamar al endpoint de prefill del backend
    const response = await apiLocal.post<ISignupPreFillResponseDTO>("/prefill", {
      dpi: data.dpi,
    })

    // El backend ya devuelve la respuesta en el formato correcto
    return response.data
  } catch (error: unknown) {
    console.error("Prefill error:", error)

    // Si el backend devuelve un error estructurado, usarlo
    if (isAxiosError(error) && error.response?.data) {
      const errorData = error.response.data as ISignupPreFillResponseDTO
      if (errorData.success !== undefined) {
        return errorData
      }
    }

    // Error genérico
    const { status, message, error: errStr } = parseAxiosError(error)
    return {
      success: false,
      error: {
        status: status || 500,
        message: message || "Error al consultar DPI",
        error: errStr || "API Error",
      },
    }
  }
}

export const signup = async (
  data: z.infer<typeof SignupAllSchema> & { isPrefilled?: boolean }
): Promise<ISignupCompleteResponseDTO> => {
  try {
    // Crear FormData para enviar archivos
    const formData = new FormData()

    // Determinar status basado en si fue pre-llenado
    // Pre-llenado = APROBADA (sin archivos), No pre-llenado = PENDIENTE (con archivos)
    const status = data.isPrefilled ? "APROBADA" : "PENDIENTE"
    formData.append("status", status)

    // Agregar todos los campos de texto
    formData.append("dpi", data.dpi)
    formData.append("email", data.correoPersonal)
    formData.append("password", data.password)
    formData.append("primerNombre", data.primerNombre)
    if (data.segundoNombre) formData.append("segundoNombre", data.segundoNombre)
    formData.append("primerApellido", data.primerApellido)
    if (data.segundoApellido) formData.append("segundoApellido", data.segundoApellido)
    if (data.correoInstitucional) formData.append("correoInstitucional", data.correoInstitucional)
    formData.append("correoPersonal", data.correoPersonal)

    // Demografía
    formData.append("cui", data.cui)
    formData.append("nit", data.nit)
    formData.append("sexo", data.sexo)
    formData.append("edad", String(data.edad))
    formData.append("departamento_residencia", data.departamento_residencia)
    formData.append("municipio_residencia", data.municipio_residencia)
    formData.append("telefono", data.telefono.replace(/-/g, ""))
    formData.append("etnia", data.etnia)
    formData.append("pais", data.pais)
    formData.append("ciudad", data.ciudad)

    // Institución
    formData.append("entidad", data.entidad)
    formData.append("institucion", data.institucion || data.entidad)
    if (data.dependencia) formData.append("dependencia", data.dependencia)
    formData.append("renglon", data.renglon)
    if (data.profesion) formData.append("profesion", data.profesion)
    if (data.puesto) formData.append("puesto", data.puesto)
    if (data.sector) formData.append("sector", data.sector)

    // Profesional
    formData.append("colegio", data.colegio)
    formData.append("numeroColegiado", data.numeroColegiado)

    // Archivos PDF
    if (data.pdf_dpi) formData.append("pdf_dpi", data.pdf_dpi)
    if (data.pdf_contrato) formData.append("pdf_contrato", data.pdf_contrato)
    if (data.pdf_certificado_profesional) formData.append("pdf_certificado_profesional", data.pdf_certificado_profesional)

    // Enviar a nuestro backend local
    const response = await apiLocal.post("/signup", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    if (response.data && (response.status === 200 || response.status === 201)) {
      return {
        success: true,
        data: {
          userId: response.data.data?.solicitudId || data.dpi,
          message: response.data.data?.message || "Usuario registrado exitosamente",
        },
      }
    }

    return {
      success: false,
      error: {
        status: 500,
        message: "No se recibió respuesta válida del servidor",
        error: "No Response",
      },
    }
  } catch (error: unknown) {
    console.error("Signup error:", error)
    if (
      isAxiosError(error) &&
      (error.response?.status === 409 || error.response?.status === 400)
    ) {
      const errorData = error.response.data as { error?: string }
      return {
        success: false,
        error: {
          status: error.response.status,
          message: errorData?.error || "El usuario ya existe o datos inválidos",
          error: "User Already Exists",
        },
      }
    }
    const { status, message, error: errStr } = parseAxiosError(error)
    return {
      success: false,
      error: {
        status: status || 500,
        message: message || "Error al crear usuario",
        error: errStr || "API Error",
      },
    }
  }
}

// Funciones de API externa eliminadas (getUsers, getUserById, updateUser, deleteUser)
// Ahora todo pasa por el backend
