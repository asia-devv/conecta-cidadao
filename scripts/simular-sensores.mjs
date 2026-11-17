#!/usr/bin/env node
/**
 * Simulador de sensores de velocidade média para o FIWARE (MQTT + UltraLight 2.0).
 *
 * Faz o papel do ESP32/Wokwi do projeto Vinheria: conecta no Mosquitto e publica,
 * a cada intervalo, a velocidade média de cada sensor em /<apikey>/traffic<ID>/attrs.
 * O IoT Agent recebe, traduz e atualiza a entidade TrafficSensor no Orion.
 *
 * Uso:
 *   npm run iot:simular -- --broker 98.91.20.39 --ids 001,002
 *
 * Opções:
 *   --broker   IP ou nome do Mosquitto (obrigatório)
 *   --port     porta MQTT (padrão 1883)
 *   --apikey   apikey do IoT Agent (padrão TEF)
 *   --ids      sensores, separados por vírgula (padrão 001)
 *   --max      velocidade máxima da via em km/h (padrão 50)
 *   --interval segundos entre envios (padrão 5)
 *   --count    quantos envios por sensor e para (padrão: sem fim)
 *
 * A velocidade oscila devagar entre trânsito livre e congestionado, com ruído,
 * para o mapa mudar de cor de vez em quando.
 */
import mqtt from 'mqtt'

export function parseArgs(argv) {
  const options = {
    port: 1883,
    apikey: 'TEF',
    ids: ['001'],
    max: 50,
    interval: 5,
    count: 0,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const [key, value] = [argv[i], argv[i + 1]]
    if (!key.startsWith('--')) continue
    i += 1
    if (key === '--broker') options.broker = value
    else if (key === '--port') options.port = Number(value)
    else if (key === '--apikey') options.apikey = value
    else if (key === '--ids')
      options.ids = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    else if (key === '--max') options.max = Number(value)
    else if (key === '--interval') options.interval = Number(value)
    else if (key === '--count') options.count = Number(value)
    else i -= 1
  }
  return options
}

/** Velocidade média no instante `t` (s) para o sensor de índice `k`: 10% a 100% da máxima. */
export function speedAt(t, k, max) {
  const wave = 0.55 + 0.4 * Math.sin(t / 45 + k * 1.7) // ciclo de alguns minutos
  const noise = (Math.random() - 0.5) * 0.12
  const ratio = Math.min(1, Math.max(0.1, wave + noise))
  return Math.round(ratio * max * 10) / 10
}

export const topicFor = (apikey, id) => `/${apikey}/traffic${id}/attrs`
export const payloadFor = (speed) => `v|${speed.toFixed(1)}`

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.broker) {
    console.error('Informe o broker MQTT: npm run iot:simular -- --broker <IP>')
    process.exit(1)
  }
  const url = `mqtt://${options.broker}:${options.port}`
  console.log(`Conectando a ${url} …`)
  const client = mqtt.connect(url, {
    clientId: `nossa-rua-sim-${Math.random().toString(16).slice(2, 8)}`,
    connectTimeout: 10_000,
    reconnectPeriod: 3_000,
  })
  client.on('error', (error) => console.error('Erro MQTT:', error.message))
  client.on('reconnect', () => console.log('Reconectando…'))

  let sent = 0
  const started = Date.now()
  const tick = () => {
    const t = (Date.now() - started) / 1000
    options.ids.forEach((id, k) => {
      const speed = speedAt(t, k, options.max)
      const topic = topicFor(options.apikey, id)
      client.publish(topic, payloadFor(speed), { qos: 0 })
      console.log(
        `${new Date().toLocaleTimeString('pt-BR')}  ${topic}  ${payloadFor(speed)}`,
      )
    })
    sent += 1
    if (options.count && sent >= options.count) {
      client.end(false, {}, () => process.exit(0))
    }
  }
  client.on('connect', () => {
    console.log(`Conectado. Publicando a cada ${options.interval} s (Ctrl+C para parar).`)
    tick()
    const timer = setInterval(tick, options.interval * 1000)
    client.once('close', () => clearInterval(timer))
  })
}

// Executa só quando chamado direto (os testes importam as funções).
if (import.meta.url === `file://${process.argv[1]}`) main()
