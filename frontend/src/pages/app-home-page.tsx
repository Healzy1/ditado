import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileAudio, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TranscriptionList } from '../components/transcriptions/transcription-list'
import { createTranscription, getApiErrorMessage, getTranscriptions } from '../services/api'
import { queryClient } from '../services/query-client'
import type { PublicTranscription } from '../types/transcription'

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024
const acceptedExtensions = new Set(['mp3', 'm4a', 'wav', 'ogg', 'webm', 'flac', 'mp4', 'mpeg'])
const iso6391Codes = ['aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az', 'ba', 'be', 'bg', 'bh', 'bi', 'bm', 'bn', 'bo', 'br', 'bs', 'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy', 'da', 'de', 'dv', 'dz', 'ee', 'el', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy', 'ga', 'gd', 'gl', 'gn', 'gu', 'gv', 'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz', 'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu', 'ja', 'jv', 'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky', 'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv', 'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my', 'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny', 'oc', 'oj', 'om', 'or', 'os', 'pa', 'pi', 'pl', 'ps', 'pt', 'qu', 'rm', 'rn', 'ro', 'ru', 'rw', 'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st', 'su', 'sv', 'sw', 'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty', 'ug', 'uk', 'ur', 'uz', 've', 'vi', 'vo', 'wa', 'wo', 'xh', 'yi', 'yo', 'za', 'zh', 'zu']
const preferredLanguageCodes = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja']
const languageNames = new Intl.DisplayNames(['pt-BR'], { type: 'language' })
const languages = iso6391Codes
  .map((code) => ({ code, name: capitalizeLanguageName(languageNames.of(code) ?? 'Idioma indisponível') }))
  .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'))

function capitalizeLanguageName(name: string) {
  return name.charAt(0).toLocaleUpperCase('pt-BR') + name.slice(1)
}

function normalizeLanguageName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

export function AppHomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [language, setLanguage] = useState('')
  const [languageQuery, setLanguageQuery] = useState('')
  const [languageListOpen, setLanguageListOpen] = useState(false)
  const [activeLanguageIndex, setActiveLanguageIndex] = useState(0)
  const [languageError, setLanguageError] = useState<string | null>(null)
  const [created, setCreated] = useState<PublicTranscription | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const listQuery = useQuery({ queryKey: ['transcriptions'], queryFn: getTranscriptions })
  const createMutation = useMutation({
    mutationFn: createTranscription,
    onSuccess: async (transcription) => {
      setCreated(transcription)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
    },
  })

  function selectFile(selected: File | undefined) {
    setFileError(null)
    if (!selected) {
      setFile(null)
      return
    }
    if (selected.size > MAX_AUDIO_SIZE_BYTES) {
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFileError('O arquivo deve ter no máximo 25 MB.')
      return
    }
    const extension = selected.name.split('.').pop()?.toLowerCase()
    if (!extension || !acceptedExtensions.has(extension)) {
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setFileError('Selecione um áudio nos formatos aceitos.')
      return
    }
    setFile(selected)
  }

  const normalizedLanguageQuery = normalizeLanguageName(languageQuery)
  const filteredLanguages = languages.filter((item) => normalizeLanguageName(item.name).includes(normalizedLanguageQuery))
  const visibleLanguages = languageQuery ? filteredLanguages : languages.filter((item) => preferredLanguageCodes.includes(item.code))

  function selectLanguage(code: string) {
    const selectedLanguage = languages.find((item) => item.code === code)
    if (!selectedLanguage) {
      return
    }
    setLanguageError(null)
    setLanguage(selectedLanguage.code)
    setLanguageQuery(selectedLanguage.name)
    setLanguageListOpen(false)
  }

  function changeLanguageQuery(value: string) {
    setLanguageError(null)
    setLanguage('')
    setLanguageQuery(value)
    setActiveLanguageIndex(0)
    setLanguageListOpen(true)
  }

  function navigateLanguageList(event: React.KeyboardEvent<HTMLInputElement>) {
    if (visibleLanguages.length === 0) {
      if (event.key === 'Escape') {
        setLanguageListOpen(false)
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setLanguageListOpen(true)
      setActiveLanguageIndex((index) => Math.min(index + 1, visibleLanguages.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setLanguageListOpen(true)
      setActiveLanguageIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter' && languageListOpen && visibleLanguages[activeLanguageIndex]) {
      event.preventDefault()
      selectLanguage(visibleLanguages[activeLanguageIndex].code)
      return
    }
    if (event.key === 'Escape') {
      setLanguageListOpen(false)
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLanguageError(null)
    setCreated(null)
    let hasValidationError = false

    if (!language) {
      setLanguageError('Selecione um idioma da lista.')
      hasValidationError = true
    }
    if (!file) {
      setFileError((currentError) => currentError ?? 'Selecione um arquivo de áudio.')
      hasValidationError = true
    }
    if (hasValidationError || !file || !language) {
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('language', language)
    createMutation.mutate(formData)
  }

  const recent = listQuery.data?.slice(0, 5) ?? []

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-10 sm:py-14">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-900 p-7 shadow-2xl shadow-slate-950/30 sm:p-10">
        <FileAudio className="text-teal-300" size={32} />
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.25em] text-teal-300">Nova transcrição</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Transforme um áudio em texto.</h1>
        <form className="mt-8 grid gap-6 lg:grid-cols-[1fr_12rem_auto] lg:items-end" onSubmit={submit}>
          <div className="block text-sm font-medium text-slate-300">
            <span className="block">Arquivo de áudio</span>
            <input accept=".mp3,.m4a,.wav,.ogg,.webm,.flac,.mp4,.mpeg,audio/*,video/mp4,video/webm" aria-describedby="audio-file-help audio-file-error" aria-invalid={Boolean(fileError)} className="peer sr-only" id="audio-file" onChange={(event) => selectFile(event.target.files?.[0])} ref={fileInputRef} type="file" />
            <label className="mt-2.5 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-teal-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-200" htmlFor="audio-file">Selecionar áudio</label>
            <span className="mt-2 block text-xs leading-5 text-slate-500" id="audio-file-help">MP3, M4A, WAV, OGG, WEBM, FLAC, MP4 ou MPEG. Máximo de 25 MB.</span>
            <span className="mt-2 block min-w-0 truncate text-xs text-slate-400" title={file?.name}>{file ? file.name : 'Nenhum arquivo selecionado.'}</span>
            {fileError ? <span className="mt-2 block text-sm text-rose-300" id="audio-file-error">{fileError}</span> : null}
          </div>
          <div className="relative block text-sm font-medium text-slate-300">
            <label htmlFor="language-search">Idioma falado no áudio</label>
            <input aria-activedescendant={languageListOpen && visibleLanguages[activeLanguageIndex] ? `language-${visibleLanguages[activeLanguageIndex].code}` : undefined} aria-autocomplete="list" aria-controls="language-options" aria-describedby="language-help language-error" aria-expanded={languageListOpen} aria-invalid={Boolean(languageError)} aria-required="true" className="input mt-2.5" id="language-search" onChange={(event) => changeLanguageQuery(event.target.value)} onFocus={() => setLanguageListOpen(true)} onKeyDown={navigateLanguageList} placeholder="Pesquise ou selecione um idioma" role="combobox" value={languageQuery} />
            {languageListOpen ? <ul className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl shadow-slate-950/50" id="language-options" role="listbox">{visibleLanguages.length > 0 ? visibleLanguages.map((item, index) => <li aria-selected={item.code === language} className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${index === activeLanguageIndex ? 'bg-teal-300 text-slate-950' : 'text-slate-200 hover:bg-slate-800'}`} id={`language-${item.code}`} key={item.code} onMouseDown={(event) => { event.preventDefault(); selectLanguage(item.code) }} role="option">{item.name}</li>) : <li className="px-3 py-2 text-sm text-slate-400" role="option">Nenhum idioma encontrado.</li>}</ul> : null}
            <span className="mt-2 block text-xs leading-5 text-slate-500" id="language-help">Digite parte do nome ou escolha uma opção da lista.</span>
            {languageError ? <span className="mt-2 block text-sm text-rose-300" id="language-error">{languageError}</span> : null}
          </div>
          <button className="primary-button gap-2" disabled={createMutation.isPending} type="submit"><Upload size={18} />{createMutation.isPending ? 'Processando...' : 'Transcrever'}</button>
        </form>
        {createMutation.isError ? <p className="error-message mt-6">{getApiErrorMessage(createMutation.error)}</p> : null}
        {created ? <section className="mt-8 rounded-2xl border border-teal-400/30 bg-teal-300/10 p-6"><p className="text-sm font-semibold text-teal-200">Transcrição concluída</p><p className="mt-3 whitespace-pre-wrap leading-7 text-slate-100">{created.text}</p></section> : null}
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300">Histórico recente</p><h2 className="mt-2 text-2xl font-semibold text-white">Suas últimas transcrições</h2></div><Link className="text-sm font-semibold text-teal-200 hover:text-teal-100" to="/app/history">Ver histórico completo</Link></div>
        {listQuery.isPending ? <p className="mt-6 text-slate-400">Carregando transcrições...</p> : null}
        {listQuery.isError ? <p className="error-message mt-6">{getApiErrorMessage(listQuery.error)}</p> : null}
        {listQuery.isSuccess && recent.length === 0 ? <p className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">Você ainda não possui transcrições.</p> : null}
        {recent.length > 0 ? <div className="mt-6"><TranscriptionList items={recent} /></div> : null}
      </section>
    </main>
  )
}
