import { LockKeyhole } from 'lucide-react'

export function AppHomePage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl place-items-center px-5 py-12 sm:px-10 sm:py-16">
      <section className="w-full max-w-2xl rounded-[2rem] border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40 sm:p-12">
        <LockKeyhole className="text-teal-300" size={32} />
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.25em] text-teal-300">Sessão protegida</p>
        <h1 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">Sua área interna está pronta.</h1>
        <p className="mt-6 max-w-lg text-base leading-8 text-slate-400 sm:text-lg">O envio de áudio e o histórico serão adicionados nas próximas etapas.</p>
      </section>
    </main>
  )
}
