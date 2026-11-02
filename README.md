# RADVEM — Front-end

Painel React/Vite para acompanhar as detecções recebidas pela API RADVEM.

## Configuração local

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local` e preencha `VITE_API_BASE_URL` com o endereço base da API, sem a rota `/detections/latest`.
3. Execute `npm run dev` e abra o endereço informado pelo Vite.

Reinicie o servidor do Vite depois de alterar `.env.local`. As variáveis `VITE_` são incluídas no código enviado ao navegador: use nelas apenas configurações públicas, sem senhas ou chaves.

Ao hospedar o painel, configure `VITE_API_BASE_URL` também no ambiente de build da plataforma e gere um novo build. Se o front e a API estiverem em origens diferentes, a configuração CORS da API precisa permitir a origem do painel.

O intervalo padrão entre consultas é de 5.000 ms. Para alterá-lo, ajuste `VITE_DETECTIONS_POLL_INTERVAL_MS`; valores inválidos ou fora do intervalo de 1.000 a 2.147.483.647 ms usam o padrão de 5.000 ms.

## Fluxo de detecções

- O microcontrolador envia as medições para `POST /detections`.
- O painel consulta `GET /detections/latest?limit=50`. A primeira resposta carrega o histórico; IDs recebidos nas consultas seguintes são tratados como novas detecções.
- A tabela apresenta os até 50 registros retornados. O radar simbólico usa até 20 deles, agrupa posições coincidentes e faz cada ponto desaparecer gradualmente. Distâncias e coordenadas recebidas em centímetros são exibidas em metros.
- A consulta para enquanto a aba está oculta e é retomada ao voltar. Em caso de falha, o painel mantém os últimos dados recebidos e mostra o erro.

O intervalo de atualização determina o atraso até o painel perceber uma nova detecção, além do tempo da rede e da API. O repositório DynamoDB atual do back percorre os registros da partição antes de aplicar o limite; com mais dados ou mais usuários consultando simultaneamente, será preciso otimizar essa leitura.

## Verificações

Execute `npm test`, `npx tsc --noEmit` e `npm run build`. O build gera os arquivos estáticos na pasta `dist`.
