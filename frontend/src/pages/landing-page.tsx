import { ArrowRight, FileAudio } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'

export function LandingPage() {
  const accessToken = useAuthStore((state) => state.accessToken)

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-xl bg-teal-300 text-slate-950">
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

        <section className="grid flex-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-teal-300">Áudio em texto</p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Suas gravações, transformadas em texto claro.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
              Envie seus áudios, acompanhe o resultado e mantenha suas anotações em um só lugar.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 sm:gap-4">
              {accessToken ? (
                <ActionLink to="/app">Ir para o Ditado</ActionLink>
              ) : (
                <>
                  <ActionLink to="/register">Criar conta</ActionLink>
                  <Link className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white" to="/login">
                    Já tenho conta
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="rounded-[2rem] border border-teal-300/20 bg-gradient-to-br from-teal-300/15 via-slate-900 to-slate-950 p-8 shadow-2xl shadow-teal-950/50 sm:p-10">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-teal-200">Fluxo simples</p>
            <ol className="mt-8 space-y-7 text-base leading-7 text-slate-300">
              <li><strong className="mr-3 text-teal-300">01</strong>Envie um arquivo de áudio.</li>
              <li><strong className="mr-3 text-teal-300">02</strong>Escolha o idioma da transcrição.</li>
              <li><strong className="mr-3 text-teal-300">03</strong>Consulte seu texto quando precisar.</li>
            </ol>
          </div>
        </section>
      </div>
    </main>
  )
}

function ActionLink({ children, to }: { children: string; to: string }) {
  return (
    <Link className="inline-flex min-h-12 items-center gap-2 rounded-full bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200" to={to}>
      {children}
      <ArrowRight size={16} />
    </Link>
  )
}
