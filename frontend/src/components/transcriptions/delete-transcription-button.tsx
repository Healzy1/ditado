import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { deleteTranscription, getApiErrorMessage } from '../../services/api'
import { queryClient } from '../../services/query-client'
import type { PublicTranscription } from '../../types/transcription'

interface DeleteTranscriptionButtonProps {
  id: string
  onDeleted?: () => void
}

export function DeleteTranscriptionButton({ id, onDeleted }: DeleteTranscriptionButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const mutation = useMutation({
    mutationFn: () => deleteTranscription(id),
    onSuccess: async () => {
      queryClient.setQueryData<PublicTranscription[]>(['transcriptions'], (items) =>
        items?.filter((item) => item.id !== id),
      )
      queryClient.removeQueries({ queryKey: ['transcriptions', id], exact: true })
      await queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
      onDeleted?.()
    },
  })

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-900/60 bg-rose-950/30 p-3 text-sm text-rose-100">
        <p>Excluir esta transcrição?</p>
        <button className="rounded-lg bg-rose-500 px-3 py-2 font-semibold text-white disabled:opacity-60" disabled={mutation.isPending} onClick={() => mutation.mutate()} type="button">
          {mutation.isPending ? 'Excluindo...' : 'Confirmar exclusão'}
        </button>
        <button className="rounded-lg px-3 py-2 font-semibold text-slate-300 hover:text-white" disabled={mutation.isPending} onClick={() => setConfirming(false)} type="button">
          Cancelar
        </button>
        {mutation.isError ? <p className="basis-full text-rose-200">{getApiErrorMessage(mutation.error)}</p> : null}
      </div>
    )
  }

  return <button className="rounded-lg border border-rose-900/70 px-3 py-2 text-sm font-semibold text-rose-300 transition hover:border-rose-400 hover:text-rose-200" onClick={() => setConfirming(true)} type="button">Excluir</button>
}
