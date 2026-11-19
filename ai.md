# Uso de Inteligência Artificial no projeto Conecta Cidadão

Este documento registra como o grupo usou ferramentas de IA no desenvolvimento do **Conecta Cidadão**, um protótipo web _mobile-first_ de serviços urbanos para moradores do estado de São Paulo (alertas e notícias da cidade, conteúdo estadual, relatos de problemas, mobilidade com sensores IoT/FIWARE e painel administrativo).

- Repositório: `conecta-cidadao` (React 19 + Vite 8 + JavaScript + Tailwind CSS 4)
- Aplicação publicada: https://conecta-cidadao-wheat.vercel.app

---

## 1. Ferramentas utilizadas

| Ferramenta                                 | Onde foi usada                                                                                                                  | Finalidade                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude (Anthropic), modelo Claude Opus** | Aplicativo do Claude, em modo de tarefas longas (o Claude executa comandos, edita arquivos e roda testes num ambiente na nuvem) | Planejamento das etapas, geração e refatoração de código React, escrita de testes, revisão de acessibilidade, documentação, mensagens de commit e explicação das decisões técnicas |
| **Conector do GitHub no Claude**           | Repositório do projeto                                                                                                          | Clonar o repositório, criar a branch de trabalho, registrar commits e enviar as alterações para abrir o pull request                                                               |
| **Conector da Vercel no Claude**           | Conta da Vercel do integrante Matheus Tamataya                                                                                  | Criar o projeto na Vercel, configurar variável de ambiente, publicar e conferir o deploy                                                                                           |
| **Memória do Claude**                      | Entre conversas                                                                                                                 | Manter as decisões já aprovadas pelo grupo (stack, nomes, regras de commit), para não precisar repetir o contexto a cada sessão                                                    |

> A IA foi usada como **assistente de desenvolvimento**: o grupo definia o que queria, aprovava o planejamento de cada etapa e revisava o resultado antes de seguir.

---

## 2. Interações realizadas

Abaixo, exemplos representativos de pedidos feitos ao Claude e do que ele entregou. Os pedidos estão como foram enviados (com a escrita informal original); as respostas estão resumidas.

### 2.1 Definição do projeto e planejamento

**Prompt (resumo do "prompt mestre" inicial):** descrevia o app (feed comunitário, feed estadual, mapa de mobilidade, painel admin), a stack obrigatória (React + Vite + JavaScript, sem TypeScript, Tailwind e Lucide), acessibilidade obrigatória (ícones grandes, modo daltonismo, toque duplo com narração) e a metodologia: trabalhar por etapas, sem implementar antes de o grupo aprovar o planejamento, com sugestões de commits semânticos em português.

**Resposta:** o Claude propôs um planejamento em etapas (fundação e _design system_, autenticação, comunidade, conteúdo estadual, mapa, painel admin, refinamento), levantou decisões em aberto (D1 a D20, por exemplo: Google Maps × Leaflet/OpenStreetMap, onde guardar imagens, como tratar CPF/CNPJ) e só começou a programar depois da aprovação.

### 2.2 Transformar o protótipo em projeto executável

**Prompt:**

> "Transforma isso tudo em um programa em react q de pra inicializar com npm run dev"

**Resposta:** o Claude organizou o código num projeto Vite completo (`package.json`, scripts `dev`, `build`, `test`, `lint`), conferiu que `npm run dev` subia sem erros e entregou o projeto pronto para rodar.

### 2.3 Mudanças de escopo pedidas pelo grupo (17/11)

**Prompt (resumo da lista enviada):** remover a divisão entre contas CPF/CNPJ; feed do Início só com notícias e alertas da cidade; alerta tocado abre o mapa com lugares seguros; menu inferior Início, Estado, +, Mapa, Perfil; dispositivos IoT em Parâmetros baseados no repositório Vinheria-Full (FIWARE + MQTT + Postman), comparando velocidade média com a velocidade máxima da via; filtro de estações de metrô e estações favoritas; alerta de linha travada abrindo rotas alternativas; relatos mostrando o órgão responsável.

**Resposta:** o Claude implementou as mudanças em commits separados, criou a integração com o FIWARE (Orion e IoT Agent) através de um proxy no servidor do Vite, uma coleção do Postman e um script que simula o sensor publicando por MQTT.

### 2.4 Ajustes de interface e mapa de trânsito (18/11)

**Prompt:**

> "1. mude o nome da aba "Estado" para "Explorar" e coloque uma lupa como ícone 2. mude o nome do aplicativo para Conecta Cidadão 3. https://github.com/Leonardo-Daniel-SC/smart-traffic, nesse repositorio, a pagina tem um mapa funcional [...] Quero que a parte do nosso mapa (quando o filtro de "Trânsito" esteja ativado) funcione exatamente igual ao repositorio de referencia, sem linhas atravessando ruas 4. Crie uma tela que simula uma tela de bloqueio do celular, e insira nela como se fosse uma notificacao do aplicativo do concecta cidadao com um alerta de tempestade na regiao, que, ao clicar nela, leva direto à tela do aplicativo na aba mapa com os abrigos proximos"

**Resposta:** o Claude estudou o repositório de referência (consulta ao Orion a cada 1 s, média de 30 s, linha cinza quando não há dados) e reproduziu esse comportamento. Para as linhas seguirem as ruas, usou o traçado real de linhas de ônibus do GTFS da SPTrans. Também criou a rota `/tela-de-bloqueio` e manteve funcionando os links antigos de `/estado`.

### 2.5 Regras de commit

**Prompt:**

> "quero que você refaça esses commits [...] os commits tem que ser feitos exclusivamente pelo tamatayya, sem sua participacao / os commits tem que ter uma linha so, sem detalhamentos enormes / exclua o co authored by claude e o claude session"

**Resposta:** o Claude recriou os quatro commits com o mesmo conteúdo, mensagem de uma linha e sem as linhas de coautoria, e atualizou a branch do pull request.

### 2.6 Deploy

**Prompt:**

> "faça deploy do repositorio na vercel, usando a conta do matheus tamataya, e utilize as dependencias necessarias para que o aplicativo funcione completamente"

**Resposta:** o Claude identificou que o proxy do FIWARE só existia no `npm run dev` e criou uma função da Vercel (`api/fiware.js`) para o app publicado conseguir falar com o Orion. Também configurou o `vercel.json` (para rotas como `/mapa` não darem 404 ao recarregar), definiu a variável `VITE_FIWARE_SERVER` e ajustou a proteção do projeto para o endereço principal ficar público.

### 2.7 Nova notificação na tela de bloqueio

**Prompt:**

> "nessa mesma tela, quero que adicione outra notificacao, mas agora avisando que uma linha de metro (por exemplo a esmeralda) esta travada, e ao clicar na notificacao, vai para o mapa mostrando tipo rotas alternativas etc"

**Resposta:** o Claude adicionou a segunda notificação (Linha 9-Esmeralda travada entre Osasco e Pinheiros), que abre o mapa com o trecho parado e as rotas alternativas. Ela prioriza a linha de uma estação favorita da pessoa, quando houver.

---

## 3. Aplicação no projeto

Funcionalidades, componentes e trechos de código desenvolvidos ou modificados com auxílio da IA:

**Estrutura e base**

- Organização por funcionalidade em `src/features/` (`home`, `state`, `community`, `map`, `auth`, `profile`, `admin`, `lockscreen`).
- Camada de serviços assíncronos em `src/services/` (dados simulados e `localStorage`), pensada para ser trocada por uma API real ([`docs/migracao-backend.md`](docs/migracao-backend.md)).
- _Design system_ com tokens de cor do Tailwind, moldura de smartphone no desktop e tela cheia no celular.

**Acessibilidade**

- Modo daltonismo, ícones grandes, alto contraste e modo de toque duplo com narração (`SpeechSynthesis`), além de foco gerenciado ao trocar de tela e textos alternativos.

**Comunidade e conteúdo**

- Relatos de problemas com foto (armazenada no IndexedDB), detecção de relatos semelhantes, histórico de status e órgão responsável.
- Feed da cidade, aba **Explorar** (antiga "Estado") com agenda de eventos.

**Mobilidade e IoT**

- Mapa com Leaflet + OpenStreetMap, carregado sob demanda.
- Camada **Trânsito** no padrão do projeto smart-traffic: `useLiveTraffic` consulta o Orion a cada segundo, `domain/iot.js` calcula a média de 30 s e classifica a via (75% e 40% da velocidade máxima), e `data/monitoredRoads.js` traz o traçado real das vias ([`docs/vias-monitoradas.md`](docs/vias-monitoradas.md)).
- Proxy do FIWARE (`server/fiwareProxy.js`), reaproveitado no Vite e na função da Vercel (`api/fiware.js`).
- Camada **Metrô e trem** com estações reais, estações favoritas e cálculo de rotas alternativas quando uma linha para (`domain/rail.js`).

**Tela de bloqueio (simulação)**

- `features/lockscreen/LockScreenPage.jsx`: relógio, data e duas notificações (linha travada e tempestade) que abrem o mapa direto no alerta.
- Funções `stormAlertFor` e `railAlertFor` em `domain/cityFeed.js`, que escolhem qual alerta mostrar conforme a cidade e as estações favoritas da pessoa.

**Painel administrativo**

- Priorização de relatos, avisos oficiais e cadastro de dispositivos IoT (IoT Agent), com leitura de teste.

**Qualidade, documentação e publicação**

- Migração do lint de oxlint para ESLint (_flat config_) e formatação com Prettier.
- README como manual de uso, guias em `docs/` e coleção do Postman.
- Configuração de deploy na Vercel.

---

## 4. Validação das respostas

O grupo não aceitou o que a IA gerava sem conferência. A validação aconteceu em quatro frentes:

1. **Aprovação por etapas.** O Claude apresentava o planejamento e as decisões antes de programar; o grupo aprovava, recusava ou ajustava (por exemplo: não guardar CPF/CNPJ nem _hashes_ deles; usar Leaflet + OpenStreetMap; autor dos relatos pseudonimizado). Cada etapa só seguia depois de o grupo revisar o resultado.

2. **Testes automatizados.** Cada funcionalidade veio com testes (Vitest + Testing Library). Na versão atual são **559 testes** em 51 arquivos, que cobrem regras de negócio e fluxos completos, como "tocar na notificação da tela de bloqueio abre o mapa com as rotas alternativas". Lint (ESLint) e formatação (Prettier) também precisavam passar antes de cada commit.

3. **Teste no navegador e com dados reais.**
   - O app foi aberto num navegador automatizado (Playwright), com capturas de tela de cada fluxo, para conferir se a tela correspondia ao que foi pedido.
   - A integração com o FIWARE foi testada com um servidor de testes que imitava o Orion e enviava leituras a cada segundo. Assim, o grupo viu a Marginal Tietê mudar de cor ("média de 12,1 km/h numa via de 60 km/h").
   - Depois do deploy, as rotas e a função `/api/fiware` foram conferidas na própria Vercel.

4. **Correções pedidas pelo grupo.** Quando o resultado não estava como esperado, o grupo pediu ajustes. Exemplos:
   - as linhas do mapa de trânsito atravessavam quarteirões, e foi pedido que seguissem as ruas como no projeto de referência;
   - as mensagens de commit estavam longas e com coautoria da IA, e foram refeitas em uma linha só;
   - o nome do app e da aba foram trocados;
   - no deploy, a proteção padrão da Vercel exigia login, e o endereço principal foi liberado.

Problemas encontrados pelos próprios testes também foram corrigidos antes de entrar no repositório: um erro nos _toasts_ que derrubava a tela, avisos do ESLint sobre regras dos _hooks_ do React e trechos de traçado de ônibus com retornos, que foram filtrados.

---

## 5. Análise crítica

### Benefícios

- **Velocidade:** funcionalidades que levariam dias (mapa com dados ao vivo, cálculo de rotas alternativas, tela de bloqueio) ficaram prontas em horas, já com testes e documentação.
- **Aprendizado:** o Claude explicava as decisões técnicas (por que um proxy para o FIWARE, por que média de 30 s, por que a variável de ambiente entra no _build_), o que ajudou o grupo a entender como a aplicação é construída, e não só a receber o código pronto.
- **Qualidade constante:** testes, acessibilidade e documentação foram feitos junto com o código, e não deixados para o fim.
- **Pesquisa de referências:** a IA leu os repositórios Vinheria-Full e smart-traffic e adaptou as ideias deles ao nosso projeto.

### Limitações

- **Ambiente restrito:** o ambiente da IA não acessava o OpenStreetMap nem servidores externos. Por isso, o mapa de fundo e a conexão real com o Orion precisaram ser conferidos pelo grupo no próprio computador ou no site publicado.
- **Dados antigos ou simulados:** o traçado das vias veio de dados da SPTrans de 2017; alertas, pontos de apoio e rotas alternativas são fictícios. A IA indicou isso na interface, mas o grupo precisou ter clareza de que é um protótipo.
- **Dependência de contexto:** em conversas longas, parte do histórico precisa ser resumida. Decisões importantes tiveram de ficar registradas (README, `docs/`, memória) para não se perderem.
- **Permissões de contas:** o deploy esbarrou em permissões (a conta da Vercel não enxergava o repositório no GitHub), e algumas ações dependeram de aprovação manual do grupo.

### Dificuldades

- Escrever pedidos claros: pedidos vagos geravam soluções diferentes do esperado. Os melhores resultados vieram quando o grupo mandou uma referência concreta (um repositório, uma imagem do mapa).
- Revisar código gerado em grande volume exige tempo. Os testes automatizados ajudaram, mas não substituem entender o que foi feito.
- Definir a autoria: o grupo decidiu que os commits seriam registrados pelos integrantes, e que o uso da IA ficaria documentado aqui, de forma transparente.

### Conclusão

A IA funcionou melhor como **par de programação**: rápida para gerar, testar e explicar, mas dependente das decisões, das referências e da revisão do grupo. As escolhas de produto, as correções de rumo e a validação final continuaram sendo responsabilidade da equipe.
