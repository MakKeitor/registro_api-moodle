"use client"

import React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import SigninForm from "./components/forms/SigninForm"
import PurpleGradientBackground from "@/components/ui/purple-gradient-background"

import Logo from "@/components/ui/logo"

const page = () => {
  const router = useRouter()
  return (
    <PurpleGradientBackground>
      <div className="flex flex-col min-h-screen p-6">
        {/* Contenido centrado */}
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="w-full max-w-md">
            {/* Header con logo */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Logo width={200} height={60} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Capacitación y formación virtual
              </h1>
              <p className="text-white/80">Iniciar sesión</p>
            </div>

            {/* Formulario en un container con fondo blanco */}
            <div className="bg-white rounded-xl shadow-2xl p-8">
              <SigninForm />
            </div>
          </div>
        </div>

        {/* Link abajo */}
        <div className="w-full text-center pb-4">
          <Link href="/auth/signup" className="text-white">
            Crear cuenta
          </Link>
        </div>
      </div>
    </PurpleGradientBackground>
  )
}

export default page
