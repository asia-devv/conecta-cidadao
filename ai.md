# Uso de Inteligência Artificial no projeto Conecta Cidadão

Este documento apresenta como ferramentas de Inteligência Artificial foram utilizadas como apoio durante o desenvolvimento do **Conecta Cidadão**, um protótipo web voltado à comunicação entre cidadãos e serviços urbanos, reunindo alertas, notícias, relatos de problemas e recursos de mobilidade.

- **Projeto:** Conecta Cidadão
- **Tecnologias:** React, Vite, JavaScript e Tailwind CSS.
- **Aplicação publicada:** https://conecta-cidadao-wheat.vercel.app

---

## 1. Ferramentas utilizadas

| Ferramenta | Finalidade |
|------------|------------|
| **Claude (Anthropic)** | Esclarecimento de dúvidas, revisão de código, identificação de bugs, sugestões técnicas e apoio em testes. |
| **GitHub** | Consulta ao código-fonte e acompanhamento das alterações. |
| **Vercel** | Auxílio na configuração e verificação da publicação. |

A inteligência artificial foi utilizada como ferramenta complementar, auxiliando na resolução de dificuldades técnicas e no aprimoramento da aplicação.

---

## 2. Interações realizadas

A seguir, alguns exemplos representativos de interações realizadas com o Claude. Os prompts foram adaptados para resumir as necessidades do grupo.

### 2.1 Organização do código

**Prompt (adaptado):**

> Analise a estrutura do nosso projeto React e sugira melhorias na organização dos componentes e arquivos, considerando os diferentes módulos da aplicação.

**Resposta do Claude:**

Apresentou sugestões de organização, separação de responsabilidades e reutilização de componentes, visando facilitar a manutenção do código.

### 2.2 Correção de problemas no mapa

**Prompt (adaptado):**

> Estamos encontrando problemas na representação das linhas de trânsito no mapa. Analise possíveis causas e indique como melhorar o posicionamento das linhas para acompanhar corretamente as ruas.

**Resposta do Claude:**

Auxiliou na análise dos dados geográficos e apresentou alternativas para melhorar a representação das vias utilizando Leaflet e OpenStreetMap.

### 2.3 Integrações e funcionalidades

**Prompt (adaptado):**

> Precisamos verificar o funcionamento da integração com FIWARE e MQTT, garantindo que os dados dos dispositivos IoT sejam recebidos e apresentados corretamente na aplicação.

**Resposta do Claude:**

Explicou aspectos da comunicação entre os serviços, auxiliou na análise dos dados recebidos e sugeriu formas de verificar o funcionamento da integração.

### 2.4 Testes e correção de bugs

**Prompt (adaptado):**

> Revise os principais fluxos da aplicação e identifique possíveis problemas em componentes, notificações e navegação. Sugira testes para verificar o funcionamento dessas funcionalidades.

**Resposta do Claude:**

Auxiliou na identificação de falhas, elaboração de testes automatizados e revisão de código, contribuindo para melhorar a estabilidade da aplicação.

---

## 3. Aplicação no projeto

A IA contribuiu principalmente nas seguintes áreas:

- **Estrutura:** sugestões de organização dos arquivos e componentes React.
- **Interface:** melhorias de navegação, responsividade e acessibilidade.
- **Integrações:** esclarecimentos sobre FIWARE, Orion e MQTT.
- **Qualidade:** identificação de bugs, revisão de código e testes automatizados.
- **Publicação:** auxílio na configuração e resolução de problemas na Vercel.

---

## 4. Validação das respostas

As sugestões da inteligência artificial foram avaliadas durante o desenvolvimento, considerando:

1. **Revisão técnica:** análise das soluções conforme os requisitos do projeto.
2. **Testes automatizados:** utilização de Vitest e Testing Library. A versão documentada possui 559 testes em 51 arquivos.
3. **Verificação prática:** testes no navegador para conferir navegação, funcionalidades e responsividade.
4. **Correções:** ajustes realizados quando eram identificados comportamentos inesperados.

---

## 5. Análise crítica

### Benefícios

- **Produtividade:** agilizou a investigação de problemas e a busca por soluções.
- **Aprendizado:** auxiliou na compreensão de conceitos e tecnologias utilizadas.
- **Qualidade:** contribuiu para a revisão do código e elaboração de testes.

### Limitações

- Algumas sugestões precisaram de adaptações para atender à estrutura do projeto.
- As respostas dependiam da clareza das informações fornecidas.
- As soluções precisavam ser verificadas no ambiente real da aplicação.

### Conclusão

A inteligência artificial foi uma ferramenta complementar importante durante o desenvolvimento do Conecta Cidadão, auxiliando na resolução de dificuldades técnicas, revisão de código e aprimoramento das funcionalidades.

A experiência demonstrou que a IA pode contribuir para a produtividade e o aprendizado, mas sua utilização exige avaliação crítica, conhecimento técnico e validação das soluções apresentadas.