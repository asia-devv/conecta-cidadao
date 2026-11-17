import { z } from 'zod'
import { getNeighborhood } from './places.js'

/**
 * Regras de validação dos formulários de conta (Zod).
 * Ficam no domínio porque são regras do produto, não da tela, e o futuro
 * backend pode repetir as mesmas.
 */

const email = z
  .string()
  .trim()
  .min(1, 'Informe o e-mail.')
  .pipe(z.email('Informe um e-mail válido, como nome@exemplo.com.'))

const name = z
  .string()
  .trim()
  .min(2, 'Informe seu nome (pelo menos 2 letras).')
  .max(80, 'O nome pode ter até 80 caracteres.')

const neighborhoodId = z
  .string()
  .refine((id) => Boolean(getNeighborhood(id)), 'Escolha o município e o bairro.')

export const loginSchema = z.object({ email })

export const adminLoginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha.'),
})

export const signupSchema = z.object({
  name,
  email,
  neighborhoodId,
  acceptedTerms: z.literal(true, {
    error: 'É preciso concordar para criar a conta de demonstração.',
  }),
})

export const profileSchema = z.object({ name })
