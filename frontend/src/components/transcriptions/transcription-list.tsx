import { Link } from 'react-router-dom'
import { DeleteTranscriptionButton } from './delete-transcription-button'
import type { PublicTranscription } from '../../types/transcription'

interface TranscriptionListProps {
  items: PublicTranscription[]
  showDelete?: boolean
}

export function TranscriptionList({ items, showDelete = false }: TranscriptionListProps) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li className="rounded-2xl border border-slate-800 bg-slate-900 p-5" key={item.id}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Link className="min-w-0 flex-1" to={`/app/transcriptions/${item.id}`}>
              <p className="truncate font-medium text-white hover:text-teal-200">{item.originalFilename}</p>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{item.text}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">{item.language} · {formatDate(item.createdAt)}</p>
            </Link>
            {showDelete ? <DeleteTranscriptionButton id={item.id} /> : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
