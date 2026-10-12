import { ArrowRight, FileAudio } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'

export function LandingPage() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-5 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between border-b border-slate-800 pb-5 sm:pb-6">
          <div className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-lg bg-teal-700 text-white">
              <FileAudio size={20} />
            </span>
            Ditado
          </div>
          {accessToken ? (
            <Link className="text-sm font-medium text-teal-200 hover:text-teal-100" to="/app">
              Acessar área interna
            </Link>
          ) : (
            <Link className="text-sm font-medium text-teal-200 hover:text-teal-100" to="/login">
              Entrar
            </Link>
          )}
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20">
          <div>
            <p className="text-sm font-medium text-teal-200">Áudio em texto</p>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Suas gravações, transformadas em texto claro.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">
              Envie seus áudios, acompanhe o resultado e mantenha suas anotações em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {accessToken ? (
                <ActionLink to="/app">Ir para o Ditado</ActionLink>
              ) : (
                <>
                  <ActionLink to="/register">Criar conta</ActionLink>
                  <Link className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white" to="/login">
                    Já tenho conta
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="border-l border-teal-700 pl-5 sm:pl-7">
            <p className="text-sm font-medium text-teal-200">Como funciona</p>
            <ol className="mt-5 divide-y divide-slate-800 text-base leading-7 text-slate-300">
              <li className="flex gap-4 py-4 first:pt-0"><strong className="font-medium text-teal-300">01</strong><span>Envie um arquivo de áudio.</span></li>
              <li className="flex gap-4 py-4"><strong className="font-medium text-teal-300">02</strong><span>Escolha o idioma da transcrição.</span></li>
              <li className="flex gap-4 py-4 pb-0"><strong className="font-medium text-teal-300">03</strong><span>Consulte seu texto quando precisar.</span></li>
            </ol>
          </div>
        </section>
      </div>
    </main>
  )
}

function ActionLink({ children, to }: { children: string; to: string }) {
  return (
    <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600" to={to}>
      {children}
      <ArrowRight size={16} />
    </Link>
  )
}
