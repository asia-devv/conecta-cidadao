import { Suspense, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation.jsx'
import { Header } from './Header.jsx'
import { StorageNotice } from './StorageNotice.jsx'
import { RouteFallback } from './RouteFallback.jsx'
import { useRouteFocus } from './useRouteFocus.js'
import { SkipLink } from './SkipLink.jsx'

/**
 * Estrutura de toda tela do app: cabeçalho, conteúdo rolável e navegação inferior.
 * É uma coluna flex: só o <main> rola, então cabeçalho e navegação ficam sempre
 * visíveis sem precisar de position: fixed.
 */
export function AppShell() {
  const mainRef = useRef(null)
  useRouteFocus(mainRef)
  return (
    <>
      <SkipLink />
      <Header />
      <main
        ref={mainRef}
        id="conteudo"
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
      >
        <StorageNotice />
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNavigation />
    </>
  )
}
