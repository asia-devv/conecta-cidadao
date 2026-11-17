import { useId, useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { compressImage } from '../../utils/image.js'
import { useObjectUrl } from '../../utils/useObjectUrl.js'
import { Button } from './Button.jsx'
import { FieldError } from './FormFields.jsx'

/**
 * Campo de foto. A imagem escolhida é reduzida e regravada como JPEG sem
 * metadados (inclusive localização) antes de ir para o formulário.
 *
 * O <input type="file"> fica escondido e o botão o aciona: assim o controle tem
 * o mesmo tamanho de toque dos outros botões. `value` é um Blob já tratado.
 */
export function PhotoField({ value, onChange, label = 'Foto', required, hint, error }) {
  const id = useId()
  const inputRef = useRef(null)
  const preview = useObjectUrl(value)
  const [busy, setBusy] = useState(false)
  const [readError, setReadError] = useState(null)

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!file) return
    setReadError(null)
    setBusy(true)
    try {
      onChange(await compressImage(file))
    } catch (e) {
      setReadError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const message = readError ?? error
  const describedBy = [hint && `${id}-hint`, message && `${id}-error`]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-2">
      <p id={`${id}-label`} className="text-sm font-bold text-ink">
        {label}
        <span className="font-normal text-ink-muted">
          {required ? ' (obrigatória)' : ' (opcional)'}
        </span>
      </p>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
        onChange={onFile}
      />
      {preview && (
        <img
          src={preview}
          alt="Prévia da foto escolhida"
          className="hairline aspect-video w-full rounded-card border-line object-cover"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon={Camera}
          disabled={busy}
          aria-describedby={describedBy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Preparando a foto…' : value ? 'Trocar foto' : 'Escolher ou tirar foto'}
        </Button>
        {value && (
          <Button variant="ghost" icon={Trash2} onClick={() => onChange(null)}>
            Remover foto
          </Button>
        )}
      </div>
      <FieldError id={`${id}-error`} message={message} />
    </div>
  )
}
