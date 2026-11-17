/**
 * "Pular para o conteúdo": primeiro item da ordem do Tab, só aparece com foco.
 * Leva ao <main id="conteudo"> do app e do painel.
 */
export function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-on-primary"
    >
      Pular para o conteúdo
    </a>
  )
}
