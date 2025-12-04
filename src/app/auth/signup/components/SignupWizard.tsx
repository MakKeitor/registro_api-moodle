"use client"

import { useState, useEffect } from "react"
import type { StepConfig } from "@/components/reusable/step/stepper-types"
import { useStepper } from "@/components/reusable/step/hooks/use-stepper"
import { Step, Steps } from "@/components/reusable/step/stepper"
import { Button } from "@/components/ui/button"
import SignupPreFillForm from "./forms/SignupPreFillForm"
import SignupCompleteForm from "./forms/SignupCompleteForm"
import SignupDemographicsForm from "./forms/SignupDemographicsForm"
import SignupInstitutionForm from "./forms/SignupInstitutionForm"
import SignupFilesForm from "./forms/6_SignupFilesForm"
import type { z } from "zod"
import {
  SignupPreFillSchema,
  SignupAllSchema,
} from "@/features/auth/schemas/auth.schema"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import SignupProfessionalInfoform from "./forms/SignupProfessionalInfoform"
import { prefill, signup } from "@/features/auth/api/auth.client"
import { toast } from "sonner"
import { mapColegioApiToValue } from "@/lib/utils"
import {
  ENTIDAD_OPTIONS,
  INSTITUCION_OPTIONS,
  RENGLON_OPTIONS,
} from "./forms/types"

// Los pasos base (siempre presentes)
const baseSteps = [
  { label: "DPI" },
  { label: "Cuenta" },
  { label: "Perfil" },
  { label: "Institución" },
  { label: "Profesional" },
] satisfies StepConfig[]

// Paso de archivos (solo si no está pre-llenado)
const filesStep = { label: "Archivos" } satisfies StepConfig

const normalizeText = (input?: string) =>
  (input ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()

const findOptionValue = <T extends { value: string; label: string }>(
  raw: string | undefined,
  options: T[]
): T["value"] | undefined => {
  const normalized = normalizeText(raw)
  if (!normalized) return undefined

  const normalizedOptions = options.map((option) => ({
    value: option.value,
    normalizedValue: normalizeText(option.value),
    normalizedLabel: normalizeText(option.label),
  }))

  const exact = normalizedOptions.find(
    (option) =>
      option.normalizedValue === normalized ||
      option.normalizedLabel === normalized
  )
  if (exact) return exact.value

  const contains = normalizedOptions.find((option) => {
    return (
      option.normalizedValue.includes(normalized) ||
      option.normalizedLabel.includes(normalized) ||
      normalized.includes(option.normalizedValue) ||
      normalized.includes(option.normalizedLabel)
    )
  })
  if (contains) return contains.value

  const endsWith = normalizedOptions.find((option) => {
    return (
      option.normalizedValue.endsWith(` ${normalized}`) ||
      option.normalizedLabel.endsWith(` ${normalized}`)
    )
  })

  return endsWith?.value
}

export default function SignupWizard() {
  const [step1Valid, setStep1Valid] = useState(false)
  const [step2Valid, setStep2Valid] = useState(false)
  const [step3Valid, setStep3Valid] = useState(false)
  const [step4Valid, setStep4Valid] = useState(false)
  const [step5Valid, setStep5Valid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPrefilling, setIsPrefilling] = useState(false)
  const [isPrefilled, setIsPrefilled] = useState(false)
  const [prefilledFields, setPrefilledFields] = useState<{
    primerNombre?: boolean
    segundoNombre?: boolean
    primerApellido?: boolean
    segundoApellido?: boolean
    correoPersonal?: boolean
    confirm_correoPersonal?: boolean
    correoInstitucional?: boolean
    confirm_correoInstitucional?: boolean
    pais?: boolean
    ciudad?: boolean
    cui?: boolean
    edad?: boolean
    sexo?: boolean
    departamento_residencia?: boolean
    municipio_residencia?: boolean
    nit?: boolean
    telefono?: boolean
    entidad?: boolean
    institucion?: boolean
    dependencia?: boolean
    renglon?: boolean
    profesion?: boolean
    puesto?: boolean
    sector?: boolean
    colegio?: boolean
    numeroColegiado?: boolean
  }>({})

  // Steps dinámicos basados en si está pre-llenado o no
  const steps = isPrefilled ? baseSteps : [...baseSteps, filesStep]

  const {
    nextStep,
    prevStep,
    resetSteps,
    activeStep,
    isDisabledStep,
    isLastStep,
    isOptionalStep,
  } = useStepper({ initialStep: 0, steps })

  const methods = useForm<z.input<typeof SignupAllSchema>>({
    resolver: zodResolver(SignupAllSchema),
    mode: "onChange",
    defaultValues: {
      // Paso 0 (DPI)
      dpi: "",
      // Paso 1 (cuenta)
      correoPersonal: "",
      confirm_correoPersonal: "",
      correoInstitucional: "",
      confirm_correoInstitucional: "",
      primerNombre: "",
      segundoNombre: "",
      primerApellido: "",
      segundoApellido: "",
      password: "",
      confirm_password: "",
      pais: "",
      ciudad: "",
      // Paso 2 (demografía)
      cui: "",
      nit: "",
      sexo: "",
      edad: undefined,
      departamento_residencia: "",
      municipio_residencia: "",
      etnia: undefined,
      telefono: "",
      // Paso 3 (institución)
      entidad: "",
      institucion: "",
      dependencia: "",
      renglon: "",
      profesion: "",
      puesto: "",
      sector: "",
      // Paso 4 (colegiado)
      colegio: "",
      numeroColegiado: "",
      // Paso 5 (archivos)
      pdf_dpi: undefined,
      pdf_contrato: undefined,
      pdf_certificado_profesional: undefined,
    },
  })

  // Validación del paso 0 (DPI)
  const watchedDpi = methods.watch("dpi")
  const step0Valid = SignupPreFillSchema.safeParse({
    dpi: watchedDpi ?? "",
  }).success

  // Función para calcular la edad desde la fecha de nacimiento
  const calculateAge = (birthDate: string): number | undefined => {
    if (!birthDate) return undefined

    // Intentar varios formatos de fecha
    let date: Date | null = null

    // Formato DD-MM-YYYY
    if (birthDate.includes("-") && birthDate.length === 10) {
      const [day, month, year] = birthDate.split("-")
      date = new Date(
        Number.parseInt(year),
        Number.parseInt(month) - 1,
        Number.parseInt(day)
      )
    }
    // Formato DD/MM/YYYY
    else if (birthDate.includes("/") && birthDate.length === 10) {
      const [day, month, year] = birthDate.split("/")
      date = new Date(
        Number.parseInt(year),
        Number.parseInt(month) - 1,
        Number.parseInt(day)
      )
    }
    // Formato YYYY-MM-DD
    else if (birthDate.includes("-") && birthDate.indexOf("-") === 4) {
      date = new Date(birthDate)
    }

    if (!date || Number.isNaN(date.getTime())) return undefined

    const today = new Date()
    let age = today.getFullYear() - date.getFullYear()
    const monthDiff = today.getMonth() - date.getMonth()

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < date.getDate())
    ) {
      age--
    }

    return age >= 0 ? age : undefined
  }

  // const handlePrefill = async () => {
  //   const dpi = methods.getValues("dpi")
  //   if (!dpi) return

  //   setIsPrefilling(true)
  //   try {
  //     const result = await prefill({ dpi })

  //     if (result.success && result.data) {
  //       // Verificar si hay datos reales
  //       const userData = result.data
  //       const hasData = Object.values(userData).some(
  //         (value) =>
  //           value &&
  //           value !== "" &&
  //           value !== userData.dpi &&
  //           value !== "Guatemala"
  //       )

  //       // Calcular edad si hay fecha de nacimiento
  //       const edad = calculateAge(userData.fechaNacimiento || "")

  //       // Prellenar los datos del formulario
  //       methods.setValue("primerNombre", userData.primerNombre || "")
  //       methods.setValue("segundoNombre", userData.segundoNombre || "")
  //       methods.setValue("primerApellido", userData.primerApellido || "")
  //       methods.setValue("segundoApellido", userData.segundoApellido || "")
  //       methods.setValue("email", userData.email || "")
  //       methods.setValue("confirm_email", userData.email || "") // Confirmar email igual al email
  //       methods.setValue("pais", userData.pais || "")
  //       methods.setValue("ciudad", userData.municipio || "")

  //       // Demografía
  //       methods.setValue("cui", userData.dpi) // CUI es el mismo DPI
  //       methods.setValue("sexo", userData.sexo || "")
  //       if (edad !== undefined) {
  //         methods.setValue("edad", edad)
  //       }

  //       // Primero establecer el departamento
  //       if (userData.departamento) {
  //         methods.setValue("departamento_residencia", userData.departamento)

  //         // Esperar un tick para que el formulario procese el departamento
  //         // y luego establecer el municipio
  //         setTimeout(() => {
  //           if (userData.municipio) {
  //             methods.setValue("municipio_residencia", userData.municipio)
  //           }
  //         }, 100)
  //       }

  //       methods.setValue("nit", userData.nit || "")
  //       methods.setValue("telefono", userData.telefono || "")

  //       // Paso 4 - Información Institucional
  //       methods.setValue("entidad", userData.entidad || "")
  //       methods.setValue("dependencia", userData.dependencia || "")
  //       methods.setValue("renglon", userData.renglon || "")

  //       // Paso 5 - Información Profesional
  //       const mappedColegio = mapColegioApiToValue(userData.colegio)
  //       methods.setValue("colegio", mappedColegio ?? "NO APLICA")
  //       methods.setValue("numeroColegiado", userData.numeroColegiado || "")

  //       // Crear objeto con información de qué campos fueron prellenados
  //       // Solo marcar como readonly los campos que realmente tienen datos
  //       const fieldsInfo = {
  //         primerNombre: !!userData.primerNombre,
  //         segundoNombre: !!userData.segundoNombre,
  //         primerApellido: !!userData.primerApellido,
  //         segundoApellido: !!userData.segundoApellido,
  //         email: !!userData.email,
  //         confirm_email: !!userData.email, // Confirmación de email también readonly si hay email
  //         pais: !!userData.pais,
  //         ciudad: !!userData.municipio,
  //         cui: true, // CUI siempre se prellena con el DPI
  //         edad: edad !== undefined,
  //         sexo: !!userData.sexo,
  //         departamento_residencia: false, // Siempre editable
  //         municipio_residencia: false, // Siempre editable
  //         nit: !!userData.nit,
  //         telefono: false, // Teléfono siempre editable

  //         // paso 5 - Información Institucional
  //         colegio: !!userData.colegio,
  //         numeroColegiado: !!userData.numeroColegiado,
  //       }

  //       setPrefilledFields(fieldsInfo)
  //       setIsPrefilled(hasData) // Solo marcar como prellenado si hay datos reales

  //       if (hasData) {
  //         toast.success("Información prellenada exitosamente")
  //       } else {
  //         toast.info("DPI consultado - complete todos los campos manualmente")
  //       }
  //       nextStep()
  //     } else {
  //       console.error("Error en la respuesta:", result.error)
  //       toast.error(result.error?.message || "Error al prellenar información")
  //       // Avanzar al siguiente paso incluso si hay error en la consulta
  //       nextStep()
  //     }
  //   } catch (error) {
  //     console.error("Error en handlePrefill:", error)
  //     toast.error("Error al consultar DPI")
  //     // Avanzar al siguiente paso incluso si hay error
  //     nextStep()
  //   } finally {
  //     setIsPrefilling(false)
  //   }
  // }

  const handlePrefill = async () => {
    const dpi = methods.getValues("dpi")
    if (!dpi) return

    setIsPrefilling(true)
    try {
      const result = await prefill({ dpi })

      if (result.success && result.data) {
        const userData = result.data

        // Campos que no cuentan para determinar si hay datos reales
        const excludedFields = ["dpi", "message", "pais"]
        // Valores por defecto que no cuentan como datos reales
        const defaultValues = ["Guatemala", "guatemala"]

        const hasData = Object.entries(userData).some(([key, value]) => {
          if (excludedFields.includes(key)) return false
          if (value === null || value === undefined) return false
          const strValue = String(value).trim()
          if (strValue === "") return false
          if (defaultValues.includes(strValue)) return false
          return true
        })

        const edad = calculateAge(userData.fechaNacimiento || "")

        methods.setValue("primerNombre", userData.primerNombre || "")
        methods.setValue("segundoNombre", userData.segundoNombre || "")
        methods.setValue("primerApellido", userData.primerApellido || "")
        methods.setValue("segundoApellido", userData.segundoApellido || "")

        // Correo personal y su confirmación
        const correoPersonalValue = userData.correoPersonal ||
          userData.correo_personal ||
          userData.correo ||
          userData.email ||
          ""
        methods.setValue("correoPersonal", correoPersonalValue)
        methods.setValue("confirm_correoPersonal", correoPersonalValue) // Auto-llenar confirmación

        // Correo institucional y su confirmación
        const correoInstitucionalValue = userData.correoInstitucional || userData.correo_institucional || ""
        methods.setValue("correoInstitucional", correoInstitucionalValue)
        methods.setValue("confirm_correoInstitucional", correoInstitucionalValue) // Auto-llenar confirmación

        methods.setValue("pais", userData.pais || "")
        methods.setValue("ciudad", userData.municipio || "")

        methods.setValue("cui", userData.dpi || dpi)
        methods.setValue("sexo", userData.sexo || "")
        if (edad !== undefined) {
          methods.setValue("edad", edad)
        } else {
          methods.setValue("edad", undefined)
        }

        methods.setValue("departamento_residencia", userData.departamento || "")
        if (userData.municipio) {
          setTimeout(() => {
            methods.setValue("municipio_residencia", userData.municipio || "")
          }, 100)
        } else {
          methods.setValue("municipio_residencia", "")
        }

        methods.setValue("nit", userData.nit || "")
        methods.setValue("telefono", userData.telefono || "")

        const entidadValue = findOptionValue(
          userData.entidad || userData.entity,
          ENTIDAD_OPTIONS
        )
        const institucionValue = findOptionValue(
          userData.institucion || userData.entidad || userData.entity,
          INSTITUCION_OPTIONS
        )
        const renglonValue = findOptionValue(userData.renglon, RENGLON_OPTIONS)

        methods.setValue(
          "entidad",
          entidadValue ?? (userData.entidad || userData.entity || "")
        )
        methods.setValue(
          "institucion",
          institucionValue ??
            (userData.institucion || userData.entidad || userData.entity || "")
        )
        methods.setValue("dependencia", userData.dependencia || "")
        methods.setValue("renglon", renglonValue ?? (userData.renglon || ""))
        methods.setValue(
          "profesion",
          userData.profesion || userData.profession || ""
        )
        methods.setValue("puesto", userData.puesto || userData.position || "")
        methods.setValue(
          "sector",
          userData.sector || userData.sector_laboral || ""
        )

        const mappedColegio = mapColegioApiToValue(userData.colegio)
        methods.setValue(
          "colegio",
          mappedColegio ?? userData.colegio ?? "NO APLICA"
        )
        methods.setValue("numeroColegiado", userData.numeroColegiado || "")

        setPrefilledFields({
          primerNombre: !!userData.primerNombre,
          segundoNombre: !!userData.segundoNombre,
          primerApellido: !!userData.primerApellido,
          segundoApellido: !!userData.segundoApellido,
          correoPersonal: !!(
            userData.correoPersonal ||
            userData.correo_personal ||
            userData.email ||
            userData.correo
          ),
          confirm_correoPersonal: !!(
            userData.correoPersonal ||
            userData.correo_personal ||
            userData.email ||
            userData.correo
          ),
          correoInstitucional: !!(
            userData.correoInstitucional || userData.correo_institucional
          ),
          confirm_correoInstitucional: !!(
            userData.correoInstitucional || userData.correo_institucional
          ),
          pais: !!userData.pais,
          ciudad: !!userData.municipio,
          cui: true,
          edad: edad !== undefined,
          sexo: !!userData.sexo,
          departamento_residencia: false,
          municipio_residencia: false,
          nit: !!userData.nit,
          telefono: false,
          entidad: !!entidadValue,
          institucion: !!institucionValue,
          dependencia: !!userData.dependencia,
          renglon: !!renglonValue,
          profesion: !!(userData.profesion || userData.profession),
          puesto: !!(userData.puesto || userData.position),
          sector: !!(userData.sector || userData.sector_laboral),
          colegio: !!userData.colegio,
          numeroColegiado: !!userData.numeroColegiado,
        })

        setIsPrefilled(hasData)

        if (hasData) {
          toast.success("Información prellenada exitosamente")
        } else {
          toast.warning("No se pudo prellenar la información", {
            description: "El DPI no está registrado en la base de datos de la CGC. Por favor, rellene todos los campos manualmente.",
            duration: 6000,
          })
        }
        nextStep()
        return
      }

      console.error("Error en la respuesta:", result.error)
      console.error("Full result:", result)
      setIsPrefilled(false)
      setPrefilledFields({})

      // Si el error está vacío, es porque no hay datos, continuar sin prellenar
      if (!result.error || Object.keys(result.error).length === 0) {
        toast.warning("No se pudo prellenar la información", {
          description: "El DPI no está registrado en la base de datos de la CGC. Por favor, rellene todos los campos manualmente.",
          duration: 6000,
        })
      } else {
        // Mostrar toast con descripción según el tipo de error
        const errorType = (result.error as { type?: string })?.type
        const errorMessage = result.error?.message || "Error al prellenar información"

        switch (errorType) {
          case "ACCESS_DENIED":
            toast.error("Acceso denegado", {
              description: errorMessage,
              duration: 6000,
            })
            break
          case "AUTH_ERROR":
            toast.error("Error de autenticación", {
              description: errorMessage,
              duration: 6000,
            })
            break
          case "TIMEOUT":
            toast.error("Tiempo de espera agotado", {
              description: errorMessage,
              duration: 5000,
            })
            break
          case "SERVICE_UNAVAILABLE":
            toast.error("Servicio no disponible", {
              description: errorMessage,
              duration: 5000,
            })
            break
          case "CONNECTION_ERROR":
            toast.error("Error de conexión", {
              description: errorMessage,
              duration: 5000,
            })
            break
          default:
            toast.error(errorMessage)
        }
      }
      nextStep()
    } catch (error) {
      console.error("Error en handlePrefill:", error)
      setIsPrefilled(false)
      setPrefilledFields({})
      toast.error("Error al consultar DPI", {
        description: "Ocurrió un error inesperado. Intente nuevamente.",
      })
      nextStep()
    } finally {
      setIsPrefilling(false)
    }
  }

  const handleSubmit = async (values: z.infer<typeof SignupAllSchema>) => {
    setIsSubmitting(true)
    try {
      // Pasar isPrefilled para que el backend sepa si debe aprobar automáticamente
      const result = await signup({ ...values, isPrefilled })

      if (result.success) {
        const status = result.data?.status || "PENDIENTE"
        const statusMsg = status === "APROBADA"
          ? "¡Felicitaciones! Tu solicitud ha sido aprobada automáticamente."
          : "Tu solicitud ha sido enviada y está pendiente de revisión."

        toast.success(statusMsg)
        resetSteps()
        setIsPrefilled(false)
        setPrefilledFields({})
        methods.reset()
      } else {
        toast.error(result.error?.message || "Error al registrar usuario")
      }
    } catch (error) {
      console.error(error)
      toast.error("Error al registrar usuario")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex h-full w-full max-h-[calc(100vh-16rem)] flex-col">
        <FormProvider {...methods}>
          <form
            id="signup-form"
            className="flex-1"
            onSubmit={methods.handleSubmit(handleSubmit, (errors) => {
              const vals = methods.getValues()
              console.log(
                "[MOCK] INVALID submit — printing current values anyway:",
                vals
              )
              console.log("[MOCK] Zod errors:", errors)
            })}>
            <Steps
              activeStep={activeStep}
              className="flex h-full max-h-[calc(100vh-26rem)] min-h-[360px]"
              contentClassName="pr-2 overflow-y-auto">
              <Step index={0} label="DPI">
                <SignupPreFillForm isPrefilled={isPrefilled} />
              </Step>

              <Step index={1} label="Cuenta">
                <SignupCompleteForm
                  onValidityChange={setStep1Valid}
                  isPrefilled={isPrefilled}
                  prefilledFields={prefilledFields}
                />
              </Step>

              <Step index={2} label="Perfil">
                <SignupDemographicsForm
                  onValidityChange={setStep2Valid}
                  prefilledFields={prefilledFields}
                />
              </Step>

              <Step index={3} label="Institución">
                <SignupInstitutionForm
                  onValidityChange={setStep3Valid}
                  prefilledFields={prefilledFields}
                />
              </Step>

              <Step index={4} label="Profesional">
                <SignupProfessionalInfoform
                  onValidityChange={setStep4Valid}
                  prefilledFields={prefilledFields}
                />
              </Step>

              {!isPrefilled && (
                <Step index={5} label="Archivos">
                  <SignupFilesForm onValidityChange={setStep5Valid} />
                </Step>
              )}
            </Steps>
          </form>
        </FormProvider>
      </div>

      <div className="mt-4 flex flex-shrink-0 items-center justify-end gap-2">
        {/* Estado de "completado" que muestra tu stepper cuando ya se avanzó más allá del último */}
        {activeStep === steps.length ? (
          <>
            <h2 className="mr-auto text-sm font-medium">
              ¡Todos los pasos completados!
            </h2>
            <Button
              onClick={() => {
                resetSteps()
                setIsPrefilled(false)
                setPrefilledFields({})
              }}
              variant="outline">
              Reiniciar
            </Button>
          </>
        ) : (
          <>
            {/* Atrás */}
            <Button
              disabled={isDisabledStep}
              onClick={prevStep}
              variant="secondary">
              Anterior
            </Button>

            {/* Avanzar / Terminar por paso */}
            {activeStep === 0 && (
              <Button
                onClick={handlePrefill}
                disabled={!step0Valid || isPrefilling}>
                {isPrefilling ? "Consultando..." : "Siguiente"}
              </Button>
            )}

            {activeStep === 1 && (
              <Button
                onClick={() => {
                  if (!step1Valid) return
                  nextStep()
                }}
                disabled={!step1Valid}>
                Siguiente
              </Button>
            )}

            {activeStep === 2 && (
              <Button
                onClick={() => {
                  if (!step2Valid) return
                  nextStep()
                }}
                disabled={!step2Valid}>
                Siguiente
              </Button>
            )}

            {activeStep === 3 && (
              <Button
                onClick={() => {
                  if (!step3Valid) return
                  nextStep()
                }}
                disabled={!step3Valid}>
                Siguiente
              </Button>
            )}

            {activeStep === 4 && (
              <Button
                onClick={() => {
                  if (!step4Valid) return
                  // Si está pre-llenado, no necesita archivos, ir directo a submit
                  if (isPrefilled) {
                    methods.handleSubmit(handleSubmit)()
                  } else {
                    nextStep()
                  }
                }}
                disabled={!step4Valid || (isPrefilled && isSubmitting)}
                type="button">
                {isPrefilled
                  ? (isSubmitting ? "Registrando..." : "Registrar Usuario")
                  : "Siguiente"
                }
              </Button>
            )}

            {activeStep === 5 && !isPrefilled && (
              <Button
                type="submit"
                form="signup-form"
                disabled={!step5Valid || isSubmitting}>
                {isSubmitting ? "Registrando..." : "Registrar Usuario"}
              </Button>
            )}
          </>
        )}
      </div>
    </>
  )
}
