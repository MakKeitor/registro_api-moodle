import React from "react"
import SignupWizard from "./components/SignupWizard"
import PurpleGradientBackground from "@/components/ui/purple-gradient-background"
import Logo from "@/components/ui/logo"
import Link from "next/link"

const page = () => {
  return (
    <PurpleGradientBackground>
      <div className="flex flex-col min-h-screen p-6">
        {/* Contenido centrado */}
        <div className="flex flex-col items-center justify-center flex-1">
          <div className="w-full max-w-4xl">
            {/* Header con logo */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <Logo width={240} height={80} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Capacitación y formación virtual
              </h1>
              <p className="text-white/80 text-lg">Registro de usuario</p>
            </div>

            {/* Wizard en un container con fondo blanco */}
            <div className="bg-white rounded-xl shadow-2xl p-8">
              <SignupWizard />
            </div>
          </div>
        </div>

        {/* Link abajo */}
        <div className="w-full text-center pb-4">
          <Link href="/auth/signin" className="text-white">
            Iniciar sesión
          </Link>
        </div>
      </div>
    </PurpleGradientBackground>
  )
}

export default page