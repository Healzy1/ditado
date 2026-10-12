import { useQuery } from '@tanstack/react-query'
import { TranscriptionList } from '../components/transcriptions/transcription-list'
import { getApiErrorMessage, getTranscriptions } from '../services/api'

export function HistoryPage() {
  const query = useQuery({ queryKey: ['transcriptions'], queryFn: getTranscriptions })

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-10 sm:py-14">
      <p className="text-sm font-medium text-teal-300">Histórico</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Todas as suas transcrições</h1>
      {query.isPending ? <p className="mt-8 text-slate-400">Carregando histórico...</p> : null}
      {query.isError ? <p className="error-message mt-8">{getApiErrorMessage(query.error)}</p> : null}
      {query.isSuccess && query.data.length === 0 ? <p className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-5 text-slate-400">Você ainda não possui transcrições.</p> : null}
      {query.data && query.data.length > 0 ? <div className="mt-8"><TranscriptionList items={query.data} showDelete /></div> : null}
    </main>
  )
}
