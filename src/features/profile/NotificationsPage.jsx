import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '../../components/layout/Page.jsx'
import { CheckboxField } from '../../components/ui/FormFields.jsx'
import { Notice } from '../../components/ui/Notice.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { useSession } from '../../context/SessionContext.jsx'
import { DEFAULT_NOTIFICATIONS, NOTIFICATION_TOPICS } from '../../domain/account.js'

/**
 * Preferências de notificação: liga/desliga geral, assuntos e dois ajustes de
 * intensidade. Cada mudança é salva na hora (sem botão "Salvar").
 */
export function NotificationsPage() {
  const { account, updateAccount } = useSession()
  const toast = useToast()
  const [error, setError] = useState(null)
  const prefs = { ...DEFAULT_NOTIFICATIONS, ...account.notifications }

  async function change(key, value) {
    setError(null)
    try {
      await updateAccount({ notifications: { ...prefs, [key]: value } })
      toast.show('Preferência salva', { tone: 'success' })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Page
      title="Notificações"
      description="Escolha sobre o que você quer ser avisado."
      backTo="/perfil"
      backLabel="Voltar ao perfil"
    >
      <Notice tone="info" title="Protótipo">
        <p>
          Suas escolhas ficam salvas, mas este protótipo ainda não envia avisos para o
          celular. Quando enviar, vai seguir exatamente o que está marcado aqui.
        </p>
        <p>
          <Link to="/tela-de-bloqueio" className="font-bold text-primary underline">
            Ver como chega uma notificação
          </Link>{' '}
          (simulação de um alerta de tempestade na tela de bloqueio).
        </p>
      </Notice>

      <CheckboxField
        label="Receber notificações"
        checked={prefs.enabled}
        onChange={(e) => change('enabled', e.target.checked)}
      />

      <fieldset
        disabled={!prefs.enabled}
        className="flex flex-col gap-4 disabled:opacity-60"
      >
        <legend className="mb-2 font-display text-lg font-bold">Assuntos</legend>
        {NOTIFICATION_TOPICS.map((topic) => (
          <div key={topic.id} className="flex flex-col gap-1">
            <CheckboxField
              label={topic.label}
              checked={prefs[topic.id]}
              onChange={(e) => change(topic.id, e.target.checked)}
            />
            <p className="pl-9 text-sm text-ink-muted">{topic.description}</p>
          </div>
        ))}
      </fieldset>

      <fieldset
        disabled={!prefs.enabled}
        className="flex flex-col gap-4 disabled:opacity-60"
      >
        <legend className="mb-2 font-display text-lg font-bold">Quando avisar</legend>
        <div className="flex flex-col gap-1">
          <CheckboxField
            label="Só o que for urgente"
            checked={prefs.urgentOnly}
            onChange={(e) => change('urgentOnly', e.target.checked)}
          />
          <p className="pl-9 text-sm text-ink-muted">
            Alertas de nível “Urgente” e linha de metrô ou trem parada.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <CheckboxField
            label="Horário silencioso (22h às 7h)"
            checked={prefs.quietHours}
            onChange={(e) => change('quietHours', e.target.checked)}
          />
          <p className="pl-9 text-sm text-ink-muted">
            À noite, só alertas urgentes tocam; o resto espera a manhã.
          </p>
        </div>
      </fieldset>

      {error && (
        <Notice tone="danger" title="Não foi possível salvar">
          <p>{error}</p>
        </Notice>
      )}
    </Page>
  )
}
