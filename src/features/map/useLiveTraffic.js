import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { roadById } from '../../data/monitoredRoads.js'
import { liveReading, recordSamples } from '../../domain/iot.js'
import { getFiwareServer, listSensorReadings } from '../../services/fiwareService.js'
import { withRoadMaxSpeed } from '../../services/mobilityService.js'

const POLL_MS = 1_000
const EMPTY = new Map()

/**
 * Trânsito ao vivo, do jeito do smart-traffic: consulta o Orion a cada segundo,
 * conta uma medição nova quando o TimeInstant muda e usa a média dos últimos
 * 30 s para colorir a via. Só roda com a camada "Trânsito" aberta e um servidor
 * FIWARE configurado.
 *
 * Devolve Map(roadId → leitura) e o estado da consulta.
 */
export function useLiveTraffic(enabled, thresholds) {
  const server = getFiwareServer()
  // medições recentes de cada sensor; só é lida e escrita dentro da consulta
  const history = useRef(new Map())

  const query = useQuery({
    queryKey: ['traffic-live', server, thresholds],
    queryFn: async () => {
      const sensors = await listSensorReadings(server)
      const now = new Date()
      recordSamples(history.current, sensors, now.getTime())
      const readings = new Map()
      for (const sensor of sensors) {
        const road = roadById(sensor.segmentId)
        if (!road) continue
        readings.set(
          road.id,
          liveReading(
            withRoadMaxSpeed(sensor),
            history.current.get(sensor.id) ?? [],
            now,
            thresholds,
          ),
        )
      }
      return readings
    },
    enabled: Boolean(enabled && server),
    refetchInterval: POLL_MS,
    retry: false,
  })

  return {
    server,
    readings: query.data ?? EMPTY,
    isError: query.isError,
    isLive: query.isSuccess,
  }
}
