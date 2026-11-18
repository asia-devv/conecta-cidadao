import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plug, Radio, Send, Trash2, Unplug } from 'lucide-react'
import { Button } from '../../components/ui/Button.jsx'
import { SelectField, TextField } from '../../components/ui/FormFields.jsx'
import { Icon } from '../../components/ui/Icon.jsx'
import { Notice } from '../../components/ui/Notice.jsx'
import { Skeleton } from '../../components/ui/States.jsx'
import { TrafficBadge } from '../../components/ui/TrafficBadge.jsx'
import { MONITORED_ROADS } from '../../data/monitoredRoads.js'
import { getCity } from '../../domain/places.js'
import { SENSOR_ID, sensorStatus, topicOf, ultralightPayload } from '../../domain/iot.js'
import {
  checkConnection,
  forgetFiwareServer,
  getFiwareServer,
  listTrafficSensors,
  provisionTrafficSensor,
  removeTrafficSensor,
  saveFiwareServer,
  sendTestReading,
} from '../../services/fiwareService.js'
import { getTrafficThresholds } from '../../services/settingsService.js'
import { formatClock } from '../../utils/format.js'
import { useAsyncAction } from '../../utils/useAsyncAction.js'

const POLL_MS = 5_000

/** Vias do mapa que podem receber um sensor, com a velocidade máxima de cada uma. */
const ROADS = MONITORED_ROADS.map((road) => ({
  segmentId: road.id,
  roadName: road.stretch ? `${road.name} (${road.stretch})` : road.name,
  cityId: road.cityId,
  cityName: getCity(road.cityId)?.name ?? road.cityId,
  maxSpeed: road.maxSpeed,
}))
const CITIES_WITH_ROADS = [...new Set(ROADS.map((r) => r.cityId))]
const roadOf = (segmentId) => ROADS.find((r) => r.segmentId === segmentId)

function ServerForm({ server, onChange }) {
  const [text, setText] = useState(server ?? '')
  const [error, setError] = useState(null)
  function submit(event) {
    event.preventDefault()
    setError(null)
    try {
      onChange(saveFiwareServer(text))
    } catch (e) {
      setError(e.message)
    }
  }
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3">
      <TextField
        label="Endereço IPv4 do servidor FIWARE"
        hint="O mesmo host do Orion (1026), IoT Agent (4041) e Mosquitto (1883). Ex.: 98.91.20.39"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        error={error}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" icon={Plug}>
          {server ? 'Trocar servidor' : 'Conectar'}
        </Button>
        {server && (
          <Button
            variant="secondary"
            icon={Unplug}
            onClick={() => {
              forgetFiwareServer()
              setText('')
              onChange(null)
            }}
          >
            Desconectar
          </Button>
        )}
      </div>
    </form>
  )
}

function SensorCard({ sensor, server, onChanged, now }) {
  const [speed, setSpeed] = useState('')
  const [confirming, setConfirming] = useState(false)
  const task = useAsyncAction()
  const { busy, error, setError } = task
  const status = sensorStatus(sensor, now, getTrafficThresholds())
  const road = roadOf(sensor.segmentId)

  /** Faz a ação no FIWARE e recarrega a lista de sensores. */
  const run = (action) =>
    task.run(async () => {
      await action()
      await onChanged()
    })

  return (
    <li className="hairline flex flex-col gap-2 rounded-card border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="flex items-center gap-2 font-display font-bold">
          <Icon icon={Radio} />
          Sensor {sensor.id}
        </h4>
        <TrafficBadge level={status.level} />
      </div>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="font-bold">Via:</dt>
          <dd className="text-ink-muted">
            {sensor.roadName ?? 'não informada'}
            {road && ` (${road.cityName})`}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-bold">Velocidade máxima:</dt>
          <dd className="text-ink-muted">
            {sensor.maxSpeed ? `${sensor.maxSpeed} km/h` : '—'}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-bold">Média captada:</dt>
          <dd className="text-ink-muted">
            {sensor.averageSpeed !== null
              ? `${sensor.averageSpeed.toFixed(1).replace('.', ',')} km/h`
              : 'nenhuma ainda'}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-bold">Diferença:</dt>
          <dd className="text-ink-muted">
            {status.status === 'ok'
              ? `${status.differenceKmh} km/h abaixo da máxima (${status.percent}%)`
              : status.status === 'stale'
                ? 'leitura antiga (mais de 10 min)'
                : '—'}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-bold">Última leitura:</dt>
          <dd className="text-ink-muted">
            {sensor.updatedAt ? formatClock(sensor.updatedAt) : '—'}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-bold">IoT Agent:</dt>
          <dd className="text-ink-muted">
            {sensor.provisioned ? sensor.deviceId : 'não cadastrado (só no Orion)'}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-ink-muted">
        Tópico MQTT: <code className="font-mono">{topicOf(sensor.id)}</code>
      </p>

      <form
        noValidate
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          const value = Number(speed)
          if (!Number.isFinite(value) || value < 0 || value > 200) {
            setError('Informe uma velocidade entre 0 e 200 km/h.')
            return
          }
          run(() => sendTestReading(server, sensor.id, value))
        }}
      >
        <div className="w-40">
          <TextField
            label="Leitura de teste (km/h)"
            type="number"
            inputMode="decimal"
            min="0"
            max="200"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" icon={Send} disabled={busy}>
          Enviar ao Orion
        </Button>
        {confirming ? (
          <>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => run(() => removeTrafficSensor(server, sensor.id))}
            >
              Confirmar remoção
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            icon={Trash2}
            aria-label={`Remover o sensor ${sensor.id}`}
            onClick={() => setConfirming(true)}
          >
            Remover
          </Button>
        )}
      </form>
      {error && (
        <Notice tone="danger" title="Não deu certo">
          <p>{error}</p>
        </Notice>
      )}
    </li>
  )
}

function AddSensorForm({ server, existingIds, onAdded }) {
  const [id, setId] = useState('')
  const [segmentId, setSegmentId] = useState(ROADS[0].segmentId)
  const { busy, error, setError, run } = useAsyncAction()

  async function submit(event) {
    event.preventDefault()
    setError(null)
    if (!SENSOR_ID.test(id)) {
      setError('Use de 1 a 12 letras ou números, sem espaço (ex.: 001).')
      return
    }
    if (existingIds.includes(id)) {
      setError(`Já existe o sensor ${id}.`)
      return
    }
    await run(async () => {
      const result = await provisionTrafficSensor(server, id, roadOf(segmentId))
      setId('')
      onAdded(`Sensor ${id} cadastrado. Publique em ${result.topic}.`)
    })
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3">
      <h3 className="font-display font-bold">Cadastrar sensor</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="ID do sensor"
          hint="Vira o dispositivo traffic<ID> no IoT Agent."
          autoComplete="off"
          value={id}
          error={error}
          onChange={(e) => setId(e.target.value.trim())}
        />
        <SelectField
          label="Via monitorada"
          value={segmentId}
          onChange={(e) => setSegmentId(e.target.value)}
        >
          {CITIES_WITH_ROADS.map((cityId) => (
            <optgroup key={cityId} label={getCity(cityId)?.name}>
              {ROADS.filter((r) => r.cityId === cityId).map((road) => (
                <option key={road.segmentId} value={road.segmentId}>
                  {road.roadName} · máx. {road.maxSpeed} km/h
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>
      </div>
      <Button type="submit" icon={Radio} disabled={busy} className="self-start">
        {busy ? 'Cadastrando…' : 'Cadastrar no IoT Agent'}
      </Button>
    </form>
  )
}

function HowToSend({ example }) {
  return (
    <details className="hairline rounded-card border-line bg-surface p-4">
      <summary className="min-h-(--tap-min) cursor-pointer content-center font-bold">
        Como enviar dados (MQTT, simulador e Postman)
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-sm">
        <p>
          O dispositivo publica a velocidade média, em UltraLight 2.0, no Mosquitto (porta
          1883). O IoT Agent traduz e atualiza a entidade no Orion; este painel lê o Orion
          a cada 5 segundos.
        </p>
        <pre className="overflow-x-auto rounded-control bg-surface-warm p-3 font-mono text-xs">
          {`# um envio, com o mosquitto_pub
mosquitto_pub -h <IP> -p 1883 -t ${topicOf(example)} -m "${ultralightPayload(42)}"

# vários sensores, com velocidades variando (simulador deste projeto)
npm run iot:simular -- --broker <IP> --ids ${example}`}
        </pre>
        <p>
          No Postman, importe{' '}
          <code className="font-mono">
            docs/postman/conecta-cidadao-iot.postman_collection.json
          </code>{' '}
          e preencha a variável <code className="font-mono">fiware_ip</code>.
        </p>
      </div>
    </details>
  )
}

/**
 * Dispositivos IoT (FIWARE): conectar ao servidor, cadastrar e remover sensores de
 * velocidade média e ver o que chega deles. O congestionamento sai da diferença
 * entre a média captada e a velocidade máxima da via.
 */
export function IotDevicesSection() {
  const queryClient = useQueryClient()
  const [server, setServer] = useState(() => getFiwareServer())
  const [feedback, setFeedback] = useState(null)

  const connection = useQuery({
    queryKey: ['admin', 'iot', 'connection', server],
    queryFn: () => checkConnection(server),
    enabled: Boolean(server),
    retry: false,
  })
  const sensors = useQuery({
    queryKey: ['admin', 'iot', 'sensors', server],
    queryFn: () => listTrafficSensors(server),
    enabled: Boolean(server) && connection.isSuccess,
    refetchInterval: POLL_MS,
    retry: false,
  })

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'iot'] })
    await queryClient.invalidateQueries({ queryKey: ['mobility'] })
  }

  const list = sensors.data ?? []
  return (
    <section
      aria-labelledby="iot-title"
      className="hairline flex flex-col gap-4 rounded-card border-line bg-surface p-4"
    >
      <h2 id="iot-title" className="font-display text-lg font-bold">
        Dispositivos IoT
      </h2>
      <p className="text-sm text-ink-muted">
        Sensores que medem a velocidade média numa via, ligados ao FIWARE (Orion + IoT
        Agent MQTT), no mesmo padrão do projeto Vinheria. Há congestionamento quando a
        média fica abaixo da velocidade máxima da via, pelos limites acima. As vias seguem
        o traçado real das ruas; o sensor do projeto smart-traffic (entidade Traffic,
        speed_kmh) também é lido e vale para a Marginal Tietê.
      </p>

      <ServerForm
        server={server}
        onChange={(next) => {
          setServer(next)
          setFeedback(null)
          queryClient.invalidateQueries({ queryKey: ['mobility'] })
        }}
      />

      <div role="status">
        {server && connection.isPending && (
          <p className="text-sm">Conectando a {server}…</p>
        )}
        {connection.isSuccess && (
          <p className="text-sm font-bold text-ok-ink">
            Conectado a {server} (Orion {connection.data.version}).
          </p>
        )}
        {feedback && <p className="text-sm font-bold">{feedback}</p>}
      </div>
      {connection.isError && (
        <Notice tone="danger" title="Não foi possível conectar">
          <p>{connection.error.message}</p>
          <p>
            Confira o IP, se as portas 1026 e 4041 estão liberadas e se o app está rodando
            com <code>npm run dev</code>.
          </p>
        </Notice>
      )}

      {connection.isSuccess && (
        <>
          <AddSensorForm
            server={server}
            existingIds={list.map((s) => s.id)}
            onAdded={async (message) => {
              setFeedback(message)
              await refresh()
            }}
          />
          <h3 className="font-display font-bold">Sensores ({list.length})</h3>
          {sensors.isPending && <Skeleton className="h-32 w-full" />}
          {sensors.isError && (
            <Notice tone="warn" title="Não foi possível ler os sensores">
              <p>{sensors.error.message}</p>
            </Notice>
          )}
          {sensors.isSuccess && list.length === 0 && (
            <p className="text-ink-muted">Nenhum sensor cadastrado neste servidor.</p>
          )}
          {list.length > 0 && (
            <ul aria-label="Sensores IoT" className="flex flex-col gap-3">
              {list.map((sensor) => (
                <SensorCard
                  key={sensor.entityName}
                  sensor={sensor}
                  server={server}
                  now={new Date(sensors.dataUpdatedAt)}
                  onChanged={refresh}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <HowToSend example={list[0]?.id ?? '001'} />
    </section>
  )
}
