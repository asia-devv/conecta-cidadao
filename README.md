# Conecta Cidadão

Protótipo web, pensado primeiro para o celular, de serviços urbanos para moradores do estado de São Paulo. Reúne:

- alertas e notícias da cidade;
- conteúdo estadual com agenda de eventos;
- relatos de problemas com acompanhamento e órgão responsável;
- mobilidade (trânsito com sensores IoT/FIWARE, ônibus, metrô e trem);
- um painel administrativo.

> **Protótipo sem backend.** Todos os dados são fictícios ou simulados e ficam no navegador. O login é apenas demonstrativo e nada aqui representa ação, alerta ou informação oficial de órgãos públicos.

## Objetivo

Mostrar, de ponta a ponta e com foco em acessibilidade, como um morador acompanharia a cidade e relataria problemas, e como uma equipe de administração priorizaria e responderia a esses relatos. A camada `src/services/` simula um backend assíncrono; trocar por uma API real muda só essa camada (veja [`docs/migracao-backend.md`](docs/migracao-backend.md)).

## Tecnologias

| Área                 | Ferramentas                                                        |
| -------------------- | ------------------------------------------------------------------ |
| Interface            | React 19, React Router 7, Tailwind CSS 4, lucide-react             |
| Dados e formulários  | TanStack Query 5, React Hook Form, Zod 4                           |
| Mapa                 | Leaflet + OpenStreetMap (carregado sob demanda)                    |
| Build e servidor dev | Vite 8 (com um proxy FIWARE próprio em `server/`)                  |
| Testes               | Vitest 5, Testing Library, jsdom, fake-indexeddb                   |
| Qualidade            | ESLint 9 (flat config), Prettier                                   |
| IoT                  | FIWARE (Orion + IoT Agent UltraLight), MQTT (`mqtt`, só no script) |

## Pré-requisitos

- **Node.js 20.19 ou mais novo** (campo `engines` do `package.json`) e npm.
- Para os sensores IoT (opcional): um servidor FIWARE com Orion (porta 1026), IoT Agent UltraLight (4041) e Mosquitto (1883) acessível pela rede.

## Instalação

```bash
git clone https://github.com/vinyciuslu/conecta-cidadao.git
cd conecta-cidadao
npm ci
```

## Variáveis de ambiente

Nenhuma é obrigatória e o projeto não usa arquivo `.env`. Há duas opções de build, passadas na linha de comando:

| Variável             | Onde é lida       | Efeito                                                                                       |
| -------------------- | ----------------- | -------------------------------------------------------------------------------------------- |
| `APP_BASE`           | `vite.config.js`  | Caminho base do build (padrão `/`). Use `./` para hospedar em qualquer subcaminho.           |
| `VITE_ROUTER=memory` | `src/app/App.jsx` | Usa `MemoryRouter`: o endereço não muda (para páginas incorporadas que não controlam a URL). |

```bash
VITE_ROUTER=memory APP_BASE=./ npm run build
```

O `.gitignore` já ignora `.env` e `.env.*`. Não versione chaves nem credenciais.

## Banco de dados e serviços externos

- **Sem banco de dados.** Contas, sessão, relatos, apoios, eventos salvos e preferências ficam no `localStorage` (chaves com o prefixo `nossa-rua:v2:`). As fotos dos relatos ficam no IndexedDB (banco `nossa-rua-images`). Tudo é **só deste navegador**: limpar os dados do site apaga tudo.
- **OpenStreetMap:** o mapa pede as imagens de fundo ao OpenStreetMap, que recebe o IP e a região vista. É o único acesso externo feito sem configuração.
- **FIWARE (opcional):** veja [Sensores IoT](#sensores-iot-fiware--mqtt).

## Como executar

```bash
npm run dev          # servidor de desenvolvimento em http://localhost:5173
```

Para conferir o build de produção:

```bash
npm run build        # gera dist/
npm run preview      # serve dist/ em http://localhost:4173
```

O proxy `/api/fiware` só existe em `npm run dev` e `npm run preview`. Um build estático publicado em outro servidor funciona normalmente, mas sem os sensores IoT reais (o mapa usa a simulação).

### Contas de demonstração

- **Morador(a):** na tela `/entrar`, botão "Entrar como morador(a)". Também é possível criar uma conta em `/cadastro` (nome, e-mail fictício e bairro; não há senha de cidadão).
- **Administração:** em `/admin/login`, e-mail `admin@demo.nossarua.test` e senha `demo-admin` (os valores aparecem na própria tela).

## Scripts disponíveis

| Comando                | O que faz                                                |
| ---------------------- | -------------------------------------------------------- |
| `npm run dev`          | Servidor de desenvolvimento do Vite (com o proxy FIWARE) |
| `npm run build`        | Build de produção em `dist/`                             |
| `npm run preview`      | Serve o build de `dist/` (com o proxy FIWARE)            |
| `npm test`             | Roda todos os testes uma vez (Vitest)                    |
| `npm run test:watch`   | Testes em modo observação                                |
| `npm run lint`         | ESLint em todo o projeto                                 |
| `npm run format`       | Formata os arquivos com Prettier                         |
| `npm run format:check` | Só verifica a formatação                                 |
| `npm run iot:simular`  | Simulador MQTT de sensores de velocidade (veja abaixo)   |

## Estrutura de diretórios

```
├─ docs/                 guias de apoio e coleção do Postman
├─ public/               arquivos estáticos (favicon)
├─ scripts/              simulador MQTT de sensores (Node)
├─ server/               proxy /api/fiware, plugin do Vite para dev e preview
└─ src/
   ├─ app/               composição: rotas, guardas de rota, cliente do TanStack Query
   ├─ components/        componentes compartilhados
   │  ├─ layout/         moldura de smartphone, cabeçalho, navegação, Page, BackLink
   │  ├─ ui/             botões, campos, cartões, selos, toasts, estados de tela
   │  ├─ a11y/           modo de toque duplo com narração
   │  ├─ post/ state/    adaptadores dos dados para os cartões
   │  └─ illustrations/
   ├─ config/            nome do app, modos de cor, contas de demonstração
   ├─ context/           sessão, relógio, acessibilidade e useAccountGate
   ├─ data/              conteúdo fictício (seed) e rede real de metrô e trem (2017)
   ├─ domain/            regras de negócio puras (sem React nem serviços)
   ├─ features/          uma pasta por área: home, state, community, map, auth, profile, admin, dev
   ├─ services/          backend simulado: localStorage, IndexedDB, FIWARE
   ├─ utils/             funções e hooks pequenos (formatação, download, useAsyncAction…)
   └─ test/              apoio dos testes (FIWARE falso, relógio, leitura dos temas)
```

## Principais funcionalidades

Menu inferior: **Início · Estado · + · Mapa · Perfil**. Em janelas a partir de 768 × 700 px o app aparece dentro de uma moldura de smartphone; em telas menores ocupa a tela toda.

| Rota                       | Funcionalidade                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `/inicio`, `/inicio/:id`   | Alertas ativos e notícias dos municípios acompanhados. Tocar num alerta abre o mapa no local dele |
| `/estado`, `/estado/:id`   | Alertas e notícias estaduais e agenda de eventos; salvar evento, baixar `.ics` e compartilhar     |
| `/relatar` (o "+")         | Relatar um problema com categoria, bairro, texto e foto; mostra relatos parecidos para apoiar     |
| `/publicacao/:id`          | Relato com linha do tempo completa e órgão responsável (fictício)                                 |
| `/mapa`                    | Trânsito, ônibus, metrô e trem. Aceita `?alerta=<id>` e `?camada=metro`                           |
| `/entrar`, `/cadastro`     | Entrada e cadastro simulados                                                                      |
| `/acessibilidade`          | Modos de cor (padrão, vermelho-verde, azul-amarelo, alto contraste), ícones grandes, toque duplo  |
| `/perfil` e subpáginas     | Meus relatos, notificações, estações favoritas, bairros acompanhados e configurações              |
| `/admin/login`, `/admin`   | Acesso administrativo e visão geral da fila                                                       |
| `/admin/ocorrencias[/:id]` | Fila priorizada com filtros e atualização de status                                               |
| `/admin/avisos`            | Avisos oficiais para um município ou bairro                                                       |
| `/admin/parametros`        | Limites do trânsito e dispositivos IoT (FIWARE)                                                   |
| `/dev/design-system`       | Guia de estilo vivo                                                                               |

Como usar alguns recursos:

- **Relógio de demonstração** (Perfil → Configurações): adianta o tempo só neste aparelho, para ver o ciclo dos relatos andar, alertas expirarem e o trânsito mudar.
- **Baixar ou excluir meus dados** (Perfil → Configurações): exporta um JSON com conta, relatos, apoios e eventos salvos, ou apaga tudo.
- **Prioridade da fila** (`domain/priority.js`): a urgência vem da categoria do relato e sempre vem primeiro. Espera e apoios desempatam, somando no máximo 15 pontos. A tela de detalhe mostra a conta inteira.
- **Status de relato:** só avança (Recebida → Em análise → Encaminhamento registrado → Em andamento → Resolvida; "Não procedente" a qualquer momento). Encaminhar e "Não procedente" exigem nota pública.

### Sensores IoT (FIWARE + MQTT)

```
sensor (ESP32/Wokwi ou npm run iot:simular)
  └─ MQTT /TEF/traffic<ID>/attrs  "v|42.5"  → Mosquitto :1883
       └─ IoT Agent UltraLight :4041 → Orion :1026 (entidade TrafficSensor)
            └─ app: POST /api/fiware (proxy do servidor do Vite) → painel e mapa
```

1. Suba uma stack FIWARE com Orion, IoT Agent UltraLight e Mosquitto, com as portas 1026, 1883 e 4041 liberadas (o projeto foi pensado para a stack Docker do repositório `fabiocabrini/fiware`).
2. Rode o app com `npm run dev` (ou `npm run preview`).
3. Em **Painel → Parâmetros → Dispositivos IoT**, informe o IPv4 do servidor e cadastre sensores escolhendo a via. O painel mostra a média, a diferença para a velocidade máxima e a situação (atualiza a cada 5 s). Também permite enviar uma leitura de teste ou remover o sensor.
4. Envie leituras com o simulador:

   ```bash
   npm run iot:simular -- --broker <IP> --ids 001,002
   ```

   Opções: `--port` (padrão 1883), `--apikey` (padrão `TEF`), `--ids` (padrão `001`), `--max` (velocidade máxima em km/h, padrão 50), `--interval` (segundos, padrão 5), `--count` (envios por sensor; padrão: sem fim).

5. Opcionalmente, importe [`docs/postman/conecta-cidadao-iot.postman_collection.json`](docs/postman/conecta-cidadao-iot.postman_collection.json) no Postman e preencha `fiware_ip`.

O proxy (`server/fiwareProxy.js`) só aceita IPv4 nas portas 1026, 4041 e 8666, caminhos sem `..` e métodos HTTP comuns, e usa `fiware-service: smart` e `fiware-servicepath: /`. No mapa, vias com sensor usam a leitura real; se o FIWARE não responder, o mapa avisa e volta à simulação.

## Desenvolvimento

- **Antes de enviar alterações:** `npm run lint`, `npm test` e `npm run format:check` devem passar.
- **Regras de arquitetura** (verificadas pelo ESLint com `no-restricted-imports`):
  - `src/domain/` é JavaScript puro: não importa React, componentes, features nem serviços.
  - Uma feature não importa de outra. O que for compartilhado vai para `components/`, `context/`, `domain/`, `services/` ou `utils/`.
- **ESLint** (`eslint.config.js`): `@eslint/js` recomendado, `eslint-plugin-react-hooks` (inclui as regras do React Compiler), `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y` e `react/jsx-uses-vars`. Usa o ESLint 9 porque o `eslint-plugin-jsx-a11y` ainda não declara suporte ao ESLint 10.
- **Serviços:** as telas só chamam funções assíncronas de `src/services/`, que lançam `ServiceError(code, message)` com a mensagem pronta para exibir. Validações usam `parseOrThrow` (Zod) e gravações obrigatórias usam `writeOrThrow`.
- **Estilo:** componentes usam só os tokens semânticos de `src/index.css` (`bg-surface`, `text-ink`…), nunca cores literais. O significado nunca depende só da cor (sempre há ícone e texto).
- **Testes:** ficam ao lado do código (`*.test.js`/`*.test.jsx`). `src/test/setup.js` limpa `localStorage` e IndexedDB a cada teste. `src/test/themes.test.js` confere o contraste WCAG de todos os modos de cor no CSS real.
- **Documentos de apoio:** [`docs/validacao-em-aparelho.md`](docs/validacao-em-aparelho.md) (roteiro de teste em celular e com leitor de tela) e [`docs/migracao-backend.md`](docs/migracao-backend.md) (como trocar os serviços por uma API).

## Limitações conhecidas

- Sem backend: login, permissões e dados são simulados e vivem no navegador. Não há segurança real.
- Não foi validado em aparelho físico nem com VoiceOver ou TalkBack.
- As notificações guardam as preferências, mas não enviam avisos ao celular.
- Pontos de apoio, órgãos responsáveis, alertas e rotas alternativas são fictícios. As estações de metrô e trem são reais, mas da rede de 2017.
- O mapa usa tiles do OpenStreetMap, adequados só para demonstração.
- O FIWARE foi verificado com testes automatizados e uma instalação mínima, não com a stack Docker completa.
- `npm audit` aponta alertas de severidade alta em `picomatch`, usado por ferramentas de desenvolvimento (Vite e Vitest). A correção sugerida rebaixa o Vitest para uma versão incompatível, por isso não foi aplicada.
