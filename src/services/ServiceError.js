/**
 * Erro de serviço com um `code` estável (para a tela decidir o que mostrar)
 * e uma mensagem em português pronta para exibição.
 */
export class ServiceError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
  }
}

/**
 * Valida `values` com um schema Zod. Se não passar, lança ServiceError('invalid')
 * com a primeira mensagem do schema, já pronta para a tela mostrar.
 */
export function parseOrThrow(schema, values) {
  const parsed = schema.safeParse(values)
  if (!parsed.success) throw new ServiceError('invalid', parsed.error.issues[0].message)
  return parsed.data
}
