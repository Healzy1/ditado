import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DeleteTranscriptionButton } from '../components/transcriptions/delete-transcription-button'
import { getApiErrorMessage, getApiErrorStatus, getTranscription } from '../services/api'

export function TranscriptionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['transcriptions', id], queryFn: () => getTranscription(id ?? ''), enabled: Boolean(id) })

  if (query.isPending) {
    return <PageNotice message="Carregando transcrição..." />
  }
  if (getApiErrorStatus(query.error) === 404) {
    return <PageNotice message="Transcrição não encontrada." />
  }
  if (query.isError) {
    return <main className="mx-auto max-w-4xl px-5 py-10 sm:px-10"><p className="error-message">{getApiErrorMessage(query.error)}</p></main>
  }
  if (!query.data || !id) {
    return <PageNotice message="Transcrição não encontrada." />
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-10 sm:py-14">
      <Link className="text-sm font-semibold text-teal-200 hover:text-teal-100" to="/app/history">Voltar ao histórico</Link>
      <section className="mt-6 rounded-[2rem] border border-slate-800 bg-slate-900 p-7 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300">{query.data.language}</p><h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-white">{query.data.originalFilename}</h1></div><DeleteTranscriptionButton id={id} onDeleted={() => navigate('/app/history', { replace: true })} /></div>
        <p className="mt-8 whitespace-pre-wrap leading-8 text-slate-200">{query.data.text}</p>
      </section>
    </main>
  )
}

function PageNotice({ message }: { message: string }) {
  return <main className="mx-auto max-w-4xl px-5 py-10 text-slate-300 sm:px-10"><p>{message}</p><Link className="mt-5 inline-block font-semibold text-teal-200 hover:text-teal-100" to="/app/history">Voltar ao histórico</Link></main>
}
