function App() {
  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-6 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(45,212,191,0.16),transparent_42%)]" />
      <section className="relative w-full max-w-2xl border-l border-teal-300/30 pl-6 sm:pl-10">
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.32em] text-teal-300">
          Ditado / fundacao
        </p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          A base esta pronta para as proximas etapas.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-slate-400 sm:text-lg">
          React e Vite estao ativos. As funcionalidades do produto serao
          adicionadas apenas nas etapas previstas pela especificacao.
        </p>
      </section>
    </main>
  )
}

export default App
