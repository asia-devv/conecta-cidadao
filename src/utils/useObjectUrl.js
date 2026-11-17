import { useEffect, useState } from 'react'

/**
 * Endereço temporário (blob:) para mostrar um Blob na tela, como a prévia de uma foto.
 * É liberado quando o Blob muda ou a tela sai, para não reter memória.
 */
export function useObjectUrl(blob) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!blob) {
      // Sincroniza com um recurso externo (URL de objeto do navegador): setState no efeito é intencional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(null)
      return undefined
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return url
}
