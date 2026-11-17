import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { UserPlus } from 'lucide-react'
import { Page } from '../../components/layout/Page.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { CheckboxField, TextField } from '../../components/ui/FormFields.jsx'
import { Notice } from '../../components/ui/Notice.jsx'
import { PlaceSelect } from '../../components/ui/PlaceSelect.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { signupSchema } from '../../domain/accountSchemas.js'

export function SignupPage() {
  const { signUp } = useSession()
  const toast = useToast()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      neighborhoodId: '',
      acceptedTerms: false,
    },
    mode: 'onTouched',
  })

  async function onSubmit(values) {
    setServerError(null)
    try {
      const { name, email, neighborhoodId } = values
      await signUp({ name, email, neighborhoodId })
      toast.show('Conta de demonstração criada', { tone: 'success' })
      navigate('/perfil', { replace: true })
    } catch (error) {
      setServerError(error.message)
    }
  }

  return (
    <Page
      title="Criar conta"
      description="Cadastro de demonstração, só para testar o app."
      backTo="/entrar"
      backLabel="Voltar para entrar"
    >
      <Notice tone="warn" title="Não use dados reais">
        <p>
          É um cadastro de demonstração: não pedimos documento e tudo fica só neste
          aparelho. Use um nome e um e-mail fictícios.
        </p>
      </Notice>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <TextField
          label="Nome"
          required
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="E-mail"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          hint="Use um e-mail fictício. Fica somente neste aparelho."
          error={errors.email?.message}
          {...register('email')}
        />

        <Controller
          name="neighborhoodId"
          control={control}
          render={({ field }) => (
            <PlaceSelect
              required
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.neighborhoodId?.message}
            />
          )}
        />

        <CheckboxField
          label="Entendo que é um protótipo: os dados são fictícios e ficam só neste aparelho."
          error={errors.acceptedTerms?.message}
          {...register('acceptedTerms')}
        />

        {serverError && (
          <Notice tone="danger" title="Não foi possível criar a conta">
            <p>{serverError}</p>
          </Notice>
        )}
        <Button type="submit" icon={UserPlus} disabled={isSubmitting}>
          {isSubmitting ? 'Criando…' : 'Criar conta'}
        </Button>
      </form>

      <p className="text-center">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-bold text-primary underline">
          Entrar
        </Link>
      </p>
    </Page>
  )
}
