import { useEffect } from 'react'
import { APP_NAME } from '../config/appConfig.js'

/**
 * Título da aba/janela: "<title> · <nome do app>". Leitores de tela anunciam esse
 * título ao trocar de tela, por isso toda tela deve definir o seu.
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`
  }, [title])
}
