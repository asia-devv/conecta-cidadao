# Vias monitoradas (camada "Trânsito" do mapa)

A camada **Trânsito** do mapa funciona como o projeto de referência
[smart-traffic](https://github.com/Leonardo-Daniel-SC/smart-traffic):

- cada via é uma linha que **segue a rua de verdade** (nada de retas cruzando quarteirões);
- a linha tem um "halo" largo e claro por baixo e a linha principal por cima, com pontas arredondadas;
- o app consulta o Orion **a cada 1 segundo**, guarda cada medição nova e pinta a via pela **média dos últimos 30 segundos**;
- sem sensor, ou sem medição nos últimos 30 s, a via fica **cinza ("Sem dados")**;
- onde há sensor aparece um marcador (a estação de medição) e, ao tocar na via, um balão com nome, velocidade média e estado.

As vias ficam em [`src/data/monitoredRoads.js`](../src/data/monitoredRoads.js).

## Como o estado é calculado

```
média de 30 s ÷ velocidade máxima da via
  ≥ 75%  → Livre
  ≥ 40%  → Lento
  < 40%  → Congestionado
```

Os limites (75% e 40%) podem ser trocados em **Painel → Parâmetros**.

## Formatos de sensor aceitos

| Entidade no Orion          | Velocidade     | Via                                                                 |
| -------------------------- | -------------- | ------------------------------------------------------------------- |
| `TrafficSensor` (este app) | `averageSpeed` | `segmentId` escolhido no cadastro do sensor                         |
| `Traffic` (smart-traffic)  | `speed_kmh`    | Marginal Tietê (`sp-marginal-tiete`), como no projeto de referência |

As duas usam `fiware-service: smart` e `fiware-servicepath: /`. Para o mapa
achar o servidor sem passar pelo painel, crie um `.env.local` com:

```
VITE_FIWARE_SERVER=98.91.20.39
```

O endereço escolhido no painel (**Parâmetros → Dispositivos IoT**) vale mais
que o do `.env.local`.

## De onde vêm os traçados

- **Marginal Tietê:** os mesmos pontos do trecho da Ponte do Limão e a mesma
  posição do sensor usados no smart-traffic.
- **Demais avenidas de São Paulo:** recortes dos percursos (_shapes_) das linhas
  de ônibus do GTFS da SPTrans de 2017 (pacote R `spgtfs`). Como o ônibus anda
  pela rua, o percurso dele é o traçado da avenida. Para cada avenida:
  1. pegamos os pontos de parada cujo nome ou descrição começam com o nome da via;
  2. procuramos o percurso de ônibus que passa mais perto desses pontos (até 45 m);
  3. cortamos só o trecho entre o primeiro e o último ponto da avenida
     (entre 0,8 km e 4 km);
  4. descartamos recortes com retorno ou volta no quarteirão (trecho mais de 15%
     mais longo que a reta entre as pontas, ou curva acima de 100°).
- **Campinas e Santos:** ainda sem vias monitoradas. O mapa avisa em vez de
  desenhar linhas.

## Como incluir uma via

Acrescente um item em `MONITORED_ROADS`:

```js
{
  id: 'sp-av-exemplo',          // é o "segmentId" que o sensor usa
  cityId: 'sao-paulo',
  name: 'Av. Exemplo',
  stretch: 'entre a R. A e a R. B',
  maxSpeed: 50,                 // km/h
  origin: 'manual',
  path: [[-23.5, -46.6], ...],  // pontos [lat, lng] seguindo a rua, um a cada esquina ou curva
  sensorAt: [-23.5, -46.6],     // onde fica o sensor (opcional)
}
```

Para os pontos de `path`, siga a rua no OpenStreetMap e anote um ponto em cada
curva; poucos pontos em trecho curvo fazem a linha "cortar" quarteirões.

## Limitações

- Os percursos de ônibus são de 2017; mudanças de mão ou obras posteriores não aparecem.
- Só a Marginal Tietê tem um sensor de referência conhecido; as outras vias ficam
  cinza até um sensor ser cadastrado para elas.
