# Nossa Rua (nome de trabalho)

Plataforma web mobile-first de inteligência urbana para moradores do estado de São Paulo: alertas e notícias da cidade, conteúdo estadual, relatos de problemas com acompanhamento e órgão responsável, e mobilidade (trânsito com sensores IoT/FIWARE, ônibus, metrô e trem).

> **Protótipo.** Frontend sem backend. Todos os dados são fictícios e simulados, a autenticação será apenas demonstrativa e nada aqui representa ação, alerta ou informação oficial de órgãos públicos.

## Como rodar

Requer Node.js 20.19 ou mais novo. Depois de descompactar, na pasta do projeto:

```bash
npm install
npm run dev        # desenvolvimento (abre em http://localhost:5173)
npm test           # testes (Vitest)
npm run lint       # oxlint (inclui regras de dependência entre módulos)
npm run format     # prettier
npm run build      # build de produção
npm run iot:simular -- --broker <IP>   # simulador MQTT de sensores (ver "Dispositivos IoT")
# build para hospedar em subcaminho, sem controlar a URL (ex.: página incorporada):
VITE_ROUTER=memory APP_BASE=./ npm run build
```

Rotas disponíveis:

| Rota                       | O que é                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `/inicio`, `/inicio/:id`   | Alertas e notícias da cidade; alerta abre o mapa, notícia abre o texto |
| `/relatar` (o "+")         | Relatar um problema (com aviso de relatos parecidos)                   |
| `/publicacao/:id`          | Relato com histórico completo e quem é responsável                     |
| `/estado`, `/estado/:id`   | Conteúdo estadual e agenda de eventos (fictícios)                      |
| `/mapa`                    | Trânsito, ônibus, metrô e trem; `?alerta=<id>` e `?camada=metro`       |
| `/entrar`, `/cadastro`     | Entrada e cadastro simulados (nome, e-mail e bairro; sem documento)    |
| `/acessibilidade`          | Modo de cor, ícones grandes e toque duplo, sem precisar entrar         |
| `/perfil`                  | Perfil e "como você aparece"                                           |
| `/perfil/publicacoes`      | Meus relatos                                                           |
| `/perfil/notificacoes`     | Preferências de notificação                                            |
| `/perfil/estacoes`         | Estações de metrô e trem favoritas                                     |
| `/perfil/bairros`          | Bairros acompanhados, com rótulos Casa, Trabalho, Faculdade, Outro     |
| `/perfil/configuracoes`    | Acessibilidade, privacidade (simulada), baixar e excluir dados         |
| `/admin/login`, `/admin`   | Acesso administrativo separado e visão geral do painel                 |
| `/admin/ocorrencias[/:id]` | Fila priorizada, filtros e atualização de status                       |
| `/admin/avisos`            | Avisos oficiais por município ou bairro                                |
| `/admin/parametros`        | Limites do trânsito e dispositivos IoT (FIWARE)                        |
| `/dev/design-system`       | Guia de estilo vivo, fora da moldura (revisão de identidade)           |

Menu inferior: **Início · Estado · + · Mapa · Perfil**. O "+" abre "Relatar um problema".

### Contas de demonstração

Na tela de entrada há um botão para entrar como morador(a) sem cadastro. O acesso administrativo usa `admin@demo.nossarua.test` / `demo-admin` (os valores aparecem na própria tela `/admin/login`).

### Privacidade no protótipo

- **Uma conta só:** não há mais divisão entre pessoa física (CPF) e empresa (CNPJ), nem publicações de autopromoção. O cadastro não pede documento algum; a conta guarda o tipo (`resident` ou `admin`) e um id interno.
- **Senha:** não existe senha de cidadão; a conta é identificada pelo e-mail, que fica só neste aparelho. A senha do admin de demonstração é pública e fixa.
- **Autor dos relatos:** por padrão aparece como "Morador(a) de {bairro}". Permissões e privacidade são **simuladas**.
- Dados ficam em `localStorage` (prefixo `nossa-rua:v2:`; dados do formato anterior, `v1`, são apagados ao abrir o app) e as fotos em IndexedDB, **só neste aparelho**. Em "Configurações" dá para baixar (conta, publicações sem a foto, apoios dados e eventos salvos) ou excluir tudo (conta, publicações, fotos, apoios, eventos salvos e as ações da administração sobre os relatos apagados).
- Fotos passam por um canvas antes de salvar, o que remove os metadados (EXIF), inclusive a localização GPS.
- **O que sai do aparelho:** as imagens de fundo do mapa, pedidas ao OpenStreetMap (que recebe o IP e a região vista; a tela do mapa avisa) e, se a administração configurar, as consultas ao servidor FIWARE (pelo proxy do servidor do Vite; só leituras de sensores, nenhum dado pessoal). Fontes e ícones vêm junto com o app; não há analytics, cookies nem outro serviço externo.
- Quem vê relatos de outras pessoas (inclusive o painel) recebe só o rótulo pseudonimizado do autor; e-mail e nome ficam na conta. O id interno do autor ainda trafega nos dados em memória: com backend, a API precisa omiti-lo.
- Se o navegador bloquear o armazenamento, o app avisa que nada será lembrado.

## Moldura de smartphone

Em janelas com pelo menos 768 px de largura **e** 700 px de altura, o app aparece dentro de um aparelho fictício. Em qualquer tela menor (celular real, tablet em pé pequeno, janela baixa) a moldura desaparece e o app ocupa a tela toda.

## Arquitetura (resumo)

```
src/
├─ app/          composição: rotas e provedores
├─ components/   layout/ (moldura, cabeçalho, navegação, Page), ui/ (componentes), illustrations/
├─ config/       valores ajustáveis (nome do app, modos de cor, contas de demonstração)
├─ context/      contextos transversais (acessibilidade, sessão)
├─ domain/       regras de negócio puras (contas, documentos, bairros, validações Zod)
├─ features/     uma pasta por área do produto (auth, profile, admin, community, state, map, dev)
├─ services/     tudo que toca em armazenamento (localStorage) e simula um backend assíncrono
├─ utils/        funções utilitárias pequenas
└─ test/         apoio dos testes (cores, leitura dos temas)
```

Regras verificadas pelo lint:

- `domain/` não importa React, componentes, features nem serviços.
- Uma feature não importa de outra feature.

### Dados simulados e tempo

- Relatos e avisos de exemplo são fictícios e genéricos, gerados por bairro com semente fixa (`src/data/seedPosts.js`). Alertas e notícias da cidade vêm de `src/data/seedCity.js` (fontes inventadas, com alvo no mapa).
- O ciclo de status dos relatos é **simulado** a partir do id do relato (`domain/statusSimulation.js`) e revelado com o passar do tempo. Cada etapa gerada traz o selo "Atualização simulada", e algumas terminam sem resolução ou pulam etapas, para o acompanhamento ser honesto.
- O **relógio de demonstração** (Configurações) adianta o tempo só neste aparelho, para ver o ciclo andar sem esperar dias.
- Apoios ficam em `localStorage`. Só contas de morador apoiam relatos, e ninguém apoia o próprio relato.
- **Fotos** ficam no IndexedDB (o `localStorage` não comporta arquivos). Antes de salvar, a foto é redesenhada em um canvas e gravada como JPEG de no máximo 1280 px: isso reduz o tamanho, corrige a rotação da câmera e **remove os metadados, inclusive o GPS**. A foto só é obrigatória onde ajuda a comprovar o problema (buraco, lixo, árvore, calçada).
- **Relatos parecidos** (`domain/similarity.js`): ao escrever, a pessoa vê relatos abertos, da mesma categoria e bairro, dos últimos 30 dias, que repetem pelo menos 2 das suas palavras (e metade delas). Regra simples e explicável, sem IA; serve para apoiar em vez de duplicar.
- **Órgão responsável** (`domain/responsibility.js`): cada relato mostra o órgão que deve agir (em São Paulo, a subprefeitura do bairro para buraco, calçada, poda e limpeza; departamento ou secretaria nos demais casos), a prefeitura e um(a) vereador(a) de referência. Tudo fictício e com "Fictícia/fictício" no nome.
- Excluir a conta apaga também os relatos, fotos, apoios e eventos salvos dela.

### Início: alertas e notícias da cidade

- Mostra só **alertas ativos** (mais graves primeiro) e **notícias** dos municípios dos bairros acompanhados (`domain/cityFeed.js`); visitante escolhe o município. Avisos da moderação e da administração entram como alertas (valem por 7 dias). Relatos de moradores não aparecem no feed: ficam em "Meus relatos", no aviso de relatos parecidos e no painel.
- **Tocar num alerta abre o mapa** (`/mapa?alerta=<id>`):
  - alerta de bairro (tempestade, alagamento, falta de energia): área tracejada e os **4 pontos de apoio mais próximos**, com distância e tempo a pé (`data/safePlaces.js`: 3 pontos fictícios por bairro com mapa; em Santos só do lado de terra);
  - **linha de metrô/trem parada**: o trecho aparece pontilhado e o app calcula **rotas alternativas** no grafo da rede (`domain/rail.js`: Dijkstra sobre estação + linha, 5 min por baldeação, passagem a pé Paulista–Consolação); a segunda rota evita uma linha da primeira, e o "ônibus de apoio" (simulado) sempre aparece. Tempos são estimativas pela distância.

### Metrô e trem

- Rede real de **12 linhas e 149 estações** (Metrô e CPTM) gerada do GTFS da SPTrans de 2017 (pacote R `spgtfs`): nomes, posição, ordem das paradas, traçado simplificado e baldeações (`data/railNetwork.js`). Estações abertas depois de 2017 (extensões das Linhas 4 e 5, Linha 13-Jade, Linha 15 além de Oratório) não aparecem.
- Camada "Metrô e trem" no Mapa (só São Paulo): linhas com cor e número oficiais, lista por linha e **favoritar estações** (perfil → "Estações favoritas").

### Dispositivos IoT (FIWARE + MQTT + Postman)

Mesma arquitetura do projeto Vinheria-Full, com sensores de **velocidade média** no lugar das lâmpadas:

```
sensor (ESP32/Wokwi ou npm run iot:simular)
  └─ MQTT /TEF/traffic<ID>/attrs  "v|42.5"  → Mosquitto :1883
       └─ IoT Agent UltraLight :4041 → Orion :1026 (entidade TrafficSensor)
            └─ app: POST /api/fiware (proxy no servidor do Vite) → painel e mapa
```

- **Proxy** (`server/fiwareProxy.js`): plugin do Vite que registra `/api/fiware` em `npm run dev` e `npm run preview`. Só aceita IPv4 nas portas 1026, 4041 e 8666, caminho sem `..` e métodos comuns; usa `fiware-service: smart` e `fiware-servicepath: /` (os mesmos do Vinheria, então o mesmo servidor FIWARE serve aos dois). Um build estático sem esse servidor não tem o proxy.
- **Sensor**: dispositivo `traffic<ID>` no IoT Agent (UltraLight sobre MQTT, apikey `TEF`), entidade `urn:ngsi-ld:TrafficSensor:<ID>`. A medida `v` vira `averageSpeed` (km/h); a via simulada que ele monitora (`segmentId`, `roadName`) e a **velocidade máxima** dela (`maxSpeed`) vão como atributos fixos.
- **Congestionamento**: média ÷ máxima da via, classificada pelos limites de Parâmetros (padrão: livre a partir de 75%, intenso abaixo de 40%). Leitura com mais de 10 min vira "sem leitura" (`domain/iot.js`).
- **Painel → Parâmetros → Dispositivos IoT**: informe o IPv4 do servidor FIWARE, cadastre sensores escolhendo a via, veja média, diferença para a máxima e situação (atualiza a cada 5 s), envie uma leitura de teste pelo Orion ou remova o sensor.
- **Mapa**: vias com sensor usam a leitura real (selo "Sensor IoT"); as outras seguem simuladas. Se o FIWARE não responder, o mapa avisa e volta à simulação.
- **Simulador MQTT** (`scripts/simular-sensores.mjs`): `npm run iot:simular -- --broker <IP> --ids 001,002 [--max 50 --interval 5 --count 10]`. A velocidade oscila entre trânsito livre e congestionado.
- **Postman**: importe `docs/postman/nossa-rua-iot.postman_collection.json` e preencha `fiware_ip`; tem cadastro, leitura de teste, consulta e remoção.
- Para subir o FIWARE, use o mesmo roteiro do Vinheria (repositório `fabiocabrini/fiware` com Docker; portas 1026, 1883, 4041 e 8666 liberadas).

### Mobilidade (Etapa 5)

- **Rede fictícia e esquemática** (`src/data/seedMobility.js`): São Paulo, Campinas e Santos. Os trechos ligam o centro de dois bairros em linha reta e as linhas passam por "pontos" com o nome do bairro. Nada segue rua real nem usa nome de empresa de ônibus, e a tela avisa isso.
- **Trânsito** (`domain/traffic.js`): cada trecho tem um sensor simulado. A leitura é função pura do horário de São Paulo (picos às 8h e às 18h, fim de semana mais leve) mais ruído com semente, uma vez por minuto; por isso o relógio de demonstração faz o trânsito andar. Classificação pela velocidade como % da normal: **livre a partir de 75%, intenso abaixo de 40%**, moderado entre os dois. Os limites são parâmetros (`classifyTraffic`, `getMobilitySnapshot({ thresholds })`) para a administração ajustar na Etapa 6. Cerca de 5% do tempo o sensor fica "sem leitura" (30 min) e a tela diz isso em vez de inventar um número.
- **Ônibus** (`domain/buses.js`): linhas circulares, operando das 5h às 23h30. O progresso da linha é a soma, de 5 em 5 minutos, da velocidade de cada instante, que depende do trânsito dos trechos dela; assim os ônibus andam de forma contínua e desaceleram nos picos. A previsão de chegada supõe que o trânsito de agora continua.
- **Atualização**: a tela consulta o serviço a cada 15 s (como faria com um backend) e o mapa só redesenha as camadas, sem desfazer o zoom da pessoa.
- **Mapa**: Leaflet + OpenStreetMap, carregado sob demanda (pacote separado de ~150 kB). Os tiles do OpenStreetMap servem para demonstração; um produto real precisa de um provedor de tiles contratado. O **Google Maps não foi implementado**: não dá para testá-lo sem chave e sem rede neste ambiente.
- **Acessibilidade**: as listas (Trânsito e Ônibus) trazem tudo o que o mapa mostra e são a base; o mapa é complementar. O nível de trânsito nunca depende só de cor: o traço muda de padrão (contínuo, tracejado, pontilhado grosso) e há legenda. Marcadores não entram na ordem do Tab. Em tela de toque, um dedo rola a página e dois movem o mapa. Se os tiles não carregarem, a tela avisa e continua útil.

### Feed estadual (Etapa 4)

- **Tudo é fictício, inclusive as instituições.** As fontes ("Central Fictícia de Alertas", "Rede Cultural Fictícia"...) foram inventadas e carregam o selo "Instituição fictícia"; o selo "Fonte institucional verificada" não é usado, porque exigiria integração real. Nenhum alerta deve ser seguido de verdade (`src/data/seedState.js`).
- **Alertas** têm nível (informativo, atenção, urgente) e validade. Depois de expirar viram "Encerrado": somem da visão "Tudo", mas continuam no filtro "Alertas". **Eventos** que já passaram seguem o mesmo princípio ("Já aconteceu").
- As datas são relativas à primeira abertura do app (`services/seedEpoch.js`, compartilhada com os relatos), então o relógio de demonstração faz alertas expirarem e eventos acontecerem.
- **O que fica em Estado**: alertas e notícias que valem para o estado todo e a agenda de eventos. Alertas e notícias de um município ficam no Início. "Meus municípios" filtra a agenda; "Salvos" ignora a região.
- **Salvar evento**: contas de morador; guardado por conta em `localStorage` e apagado junto com a conta.
- **Adicionar à agenda**: gera um `.ics` no próprio navegador (`domain/ics.js`: CRLF, texto escapado, linhas dobradas em 75 bytes, datas em UTC). O título leva o prefixo "[Demonstração]" para o evento fictício não ser confundido com um compromisso real.
- **Compartilhar**: usa o menu do aparelho (Web Share API) e, onde não existe, copia o link. O link só abre o mesmo conteúdo neste protótipo, pois não há servidor.

`services/` expõe funções assíncronas (com um pequeno atraso simulado). As telas não sabem onde os dados ficam: trocar por um backend muda o conteúdo dos serviços, não as telas. Consultas passam pelo TanStack Query (cache, carregando e erro). Imagens ficam no IndexedDB (`services/imageStore.js`).

### Administração (Etapa 6)

Painel em página larga, sem a moldura de smartphone, só para a conta de administração (`/admin/login`). Tudo continua no navegador: as ações do painel alteram o que os moradores **deste navegador** veem, mas não acionam nenhum órgão público.

- **Fila priorizada** (`domain/priority.js`): o **nível de urgência vem da categoria** do relato (alta 90, média 60, baixa 30) e **sempre vem primeiro**. Dentro do nível, desempatam a espera (em relação a um prazo de referência de 24 h, 72 h ou 7 dias, valores fictícios) e o apoio da comunidade (20 apoios = máximo). Os dois juntos somam no máximo **+15 pontos**; como os níveis distam 30, um relato menos grave nunca passa à frente de um mais grave. A tela de detalhe mostra a conta inteira, sem caixa-preta.
- **Atualização de status** (`domain/reportStatus.js`, `services/adminService.js`): só para frente (Recebida → Em análise → Encaminhamento registrado → Em andamento → Resolvida; "Não procedente" a qualquer momento; etapas puladas aparecem como "não registradas"). "Encaminhamento registrado" e "Não procedente" exigem nota pública (10 a 280 caracteres). Relato encerrado não é reaberto e a espera deixa de contar.
- **Histórico transparente** (`domain/reportTimeline.js`): depois da primeira ação da administração, a simulação automática daquele relato **para**; ficam só os eventos simulados anteriores (marcados "Simulado") e os registrados à mão (marcados como "administração de demonstração", sem selo de simulado). O morador vê tudo na linha do tempo.
- **Avisos oficiais**: nível, título e descrição para um município inteiro ou um bairro. Aparecem na comunidade com a origem "moderação". A administração só retira os avisos que ela mesma criou (os do seed são fixos).
- **Parâmetros**: limites do trânsito (padrão 75% e 40%), validados na tela e no serviço, com "Restaurar padrão". O mapa passa a usar os novos valores.
- **Segurança**: nenhuma de verdade. Login, permissões e dados estão no navegador; o `requireAdmin` do serviço existe para manter o contrato que um backend teria de cumprir.

Limites conhecidos: urgência só pela categoria (sem ajuste manual); prazos de referência fictícios; testado em Chrome com tela larga, 390 px e alto contraste, sem leitor de tela real.

### Acessibilidade e refinamento (Etapa 7)

- **Modos de exibição** (em `/acessibilidade` e Configurações): padrão, vermelho-verde, azul-amarelo e alto contraste; ícones e áreas de toque grandes. Valem para o aparelho, inclusive antes do login.
- **Toque duplo com narração** (opcional, desligado por padrão; `components/a11y/GuidedTap.jsx`): o primeiro toque num botão ou link o descreve em voz alta (SpeechSynthesis, voz do próprio aparelho, pt-BR) e o destaca; o segundo, no mesmo item, ativa. Campos de texto não são bloqueados. Teclado e leitores de tela passam direto (clique sem `detail`), pois o modo **não substitui VoiceOver nem TalkBack**. Sem narração no navegador, o modo avisa e continua pedindo dois toques.
- **Foco e títulos:** ao trocar de tela o foco vai para o conteúdo e a rolagem volta ao topo; cada tela tem um `h1` e níveis coerentes; há link "Pular para o conteúdo" no app e no painel.
- **Desempenho:** telas menos usadas são carregadas sob demanda (`React.lazy`); o pacote inicial ficou em ~430 kB (gzip ~134 kB), e o mapa (Leaflet) só baixa ao abrir o Mapa.
- **Robustez:** `ErrorBoundary` global (tela quebrada ou código que não baixa), 404 com título, carregando/erro/vazio em todas as telas com dados, aviso de armazenamento bloqueado.
- **Verificação:** além dos testes, o axe-core (WCAG 2.1 A/AA e boas práticas) foi rodado em todas as telas nos modos padrão, vermelho-verde e alto contraste, em celular e desktop, com zero violações. É triagem automática: não substitui leitor de tela real nem teste com pessoas.

Documentos de apoio: [`docs/validacao-em-aparelho.md`](docs/validacao-em-aparelho.md) (roteiro para testar em celular e com leitor de tela) e [`docs/migracao-backend.md`](docs/migracao-backend.md) (como trocar a camada de serviços por uma API).

## Limitações conhecidas

- Sem backend: login, permissões e dados são simulados e vivem no navegador (nenhuma segurança real).
- Não foi testado em aparelho físico nem com VoiceOver/TalkBack; o toque duplo precisa de validação com quem vai usá-lo.
- Google Maps não foi implementado (não dá para testar sem chave); o mapa usa Leaflet + OpenStreetMap, e as imagens de fundo nunca foram vistas com ruas no ambiente de desenvolvimento (bloqueadas), apenas o aviso de falha.
- Arquivos `.ics` não foram abertos em um calendário real.
- Administração: não reabre relatos encerrados; urgência só pela categoria; prazos de referência fictícios; só retira avisos criados por ela.
- Notificações: as preferências ficam salvas, mas o protótipo ainda não envia avisos ao celular (PWA/push fora do escopo da v1).
- Pontos de apoio, órgãos responsáveis, vereadores, alertas e rotas alternativas são fictícios; as estações de metrô/trem são reais, mas de 2017.
- FIWARE: verificado com um FIWARE "de bancada" local (Orion, IoT Agent e broker MQTT mínimos) e com testes automatizados; não foi testado contra a stack Docker completa.

## Design system

- Tokens semânticos em `src/index.css` (cores por modo: padrão, vermelho-verde, azul-amarelo, alto contraste; escala de ícones e áreas de toque).
- Componentes usam só nomes semânticos (`bg-surface`, `text-ink`...), nunca cores literais.
- `src/test/themes.test.js` valida o CSS real: contraste WCAG (texto ≥ 4,5:1, elementos gráficos ≥ 3:1) em todos os modos e distinção entre "bom / atenção / ruim" sob simulação de daltonismo. É triagem automática e **não substitui** teste com pessoas.

## Roadmap

1. Fundação
2. Autenticação e perfis
3. Comunidade
4. Feed estadual
5. Mobilidade
6. Administração
7. Refinamento (acessibilidade, desempenho, robustez, privacidade)
8. Revisão de escopo: conta única, Início com alertas e notícias da cidade, metrô e trem, pontos de apoio e rotas alternativas, notificações, órgão responsável e sensores IoT com FIWARE
