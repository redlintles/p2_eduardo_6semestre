# Drive to Blob

Aplicação web em **Next.js** que copia os arquivos de uma pasta do **Google Drive** para um contêiner do **Azure Blob Storage**, com interface gráfica para listar a origem e o destino e um console que mostra o status de cada transferência.

> Projeto acadêmico do curso de Desenvolvimento de Software Multiplataforma (FATEC Cotia).

## Funcionalidades

- Autenticação no Google Drive por **Service Account** (escopo somente leitura).
- Autenticação no Azure por **Connection String** ou, alternativamente, **SAS URL**.
- **Listagem da origem**: arquivos da pasta configurada do Drive (`GET /api/source`).
- **Listagem do destino**: blobs do contêiner (`GET /api/destination`).
- **Transferência** de todos os arquivos ou apenas dos selecionados (`POST /api/transfer`), em streaming e com até 3 cópias em paralelo.
- **Status de cada transferência** (sucesso ou erro) no console do servidor e no console da interface.
- Exportação automática de arquivos nativos do Google: Docs → `.docx`, Planilhas → `.xlsx`, Apresentações → `.pptx`, Desenhos → `.png`.
- Criação automática do contêiner (privado) caso ele não exista.

## Tecnologias

| Camada      | Tecnologia                                        |
| ----------- | ------------------------------------------------- |
| Framework   | Next.js (App Router) + React                      |
| Estilização | Tailwind CSS v4 via `@apply`, nomenclatura BEM    |
| Google      | `@googleapis/drive` + `google-auth-library`       |
| Azure       | `@azure/storage-blob`                             |
| Deploy      | Vercel                                            |

## Estrutura do projeto

```
src/
├── app/
│   ├── api/
│   │   ├── source/route.js        # GET  - lista arquivos do Drive
│   │   ├── destination/route.js   # GET  - lista blobs do contêiner
│   │   └── transfer/route.js      # POST - copia Drive → Blob
│   ├── layout.js
│   └── page.js
├── components/                    # Componentes React (um por pasta)
├── hooks/                         # Estado da interface (listas, log, transferência)
├── lib/
│   ├── azure/blobClient.js        # Cliente autenticado do Azure
│   ├── google/driveClient.js      # Cliente autenticado do Drive
│   ├── google/googleWorkspaceExport.js
│   ├── config/env.js              # Leitura e validação das variáveis de ambiente
│   ├── errors/appErrors.js        # Erros com mensagens seguras para o usuário
│   ├── http/apiResponse.js        # Padronização das respostas JSON
│   ├── logger/transferLogger.js   # Log de status no console do servidor
│   └── client/                    # Utilitários usados no navegador
├── services/
│   ├── driveService.js            # listSourceFiles, openFileStream
│   ├── blobService.js             # listDestinationFiles, uploadStream
│   └── transferService.js         # transferFiles
└── styles/
    ├── globals.css                # Tailwind + tokens de tema
    └── blocks/                    # Um arquivo CSS por bloco BEM
```

O código que acessa credenciais fica em módulos marcados com `import "server-only"`, então o build falha se algum deles for importado por um componente do navegador.

## Pré-requisitos

- Node.js 20.9 ou superior
- Uma conta de armazenamento do Azure
- Um projeto no Google Cloud com a **Google Drive API** ativada e uma Service Account (passo a passo em [`docs/google-service-account.md`](docs/google-service-account.md))

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de exemplo e preencha os valores:

   ```bash
   cp .env.example .env.local
   ```

| Variável                          | Descrição                                                                  |
| --------------------------------- | -------------------------------------------------------------------------- |
| `GOOGLE_DRIVE_FOLDER_ID`          | ID da pasta de origem (trecho da URL depois de `/folders/`).               |
| `GOOGLE_SERVICE_ACCOUNT_BASE64`   | JSON da Service Account em Base64 (`base64 -w 0 service-account.json`).    |
| `AZURE_STORAGE_CONNECTION_STRING` | Connection String da conta de armazenamento.                               |
| `AZURE_STORAGE_SAS_URL`           | Alternativa à Connection String. É usada só se a Connection String faltar. |
| `AZURE_STORAGE_CONTAINER_NAME`    | Nome do contêiner de destino (ex.: `aluno-redlint`).                       |

> **Por que `aluno-redlint` e não `Aluno_xxx`?** O Azure aceita no nome de contêiner apenas letras minúsculas, números e hífens (3 a 63 caracteres). Maiúsculas e `_` fazem a criação falhar.

> **Por que as credenciais não estão no código?** O `.env.local` está no `.gitignore`. Chaves do Azure enviadas para um repositório público são detectadas pelo secret scanning do GitHub e podem ser revogadas automaticamente.

3. Rode em modo de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse <http://localhost:3000>.

## Como usar

1. O painel **Origem** lista os arquivos da pasta do Drive e o painel **Destino** lista os blobs do contêiner.
2. Marque arquivos e clique em **Copiar selecionados**, ou clique em **Copiar todos**.
3. Acompanhe o status de cada arquivo no **Console de transferências**. O mesmo log aparece no terminal do servidor (ou em *Logs* no Vercel):

   ```
   [drive-to-blob] 2026-11-23T22:10:01.120Z INFO    Iniciando transferência de 3 arquivo(s).
   [drive-to-blob] 2026-11-23T22:10:02.481Z SUCESSO "relatorio.pdf" -> https://<conta>.blob.core.windows.net/aluno-redlint/relatorio.pdf
   [drive-to-blob] 2026-11-23T22:10:02.913Z ERRO    "planilha": Insufficient permissions (código 403)
   [drive-to-blob] 2026-11-23T22:10:02.914Z INFO    Concluído: 2 sucesso(s), 1 erro(s).
   ```

## API

Todas as respostas seguem o formato `{ "ok": true, "data": ... }` ou `{ "ok": false, "error": "mensagem" }`.

### `GET /api/source`

Retorna os arquivos da pasta do Drive:

```json
{ "ok": true, "data": [{ "id": "1AbC...", "name": "notas.docx", "mimeType": "...", "size": 12034, "modifiedAt": "2026-11-20T13:00:00.000Z", "targetName": "notas.docx", "isTransferable": true }] }
```

### `GET /api/destination`

Retorna os blobs do contêiner (`name`, `size`, `contentType`, `modifiedAt`).

### `POST /api/transfer`

Corpo opcional. Sem corpo (ou `{}`) copia todos os arquivos; com `fileIds`, copia só os informados:

```json
{ "fileIds": ["1AbC...", "1XyZ..."] }
```

Os IDs são conferidos com a listagem da pasta: o servidor recusa arquivos que não pertencem à origem.

```json
{
  "ok": true,
  "data": {
    "results": [{ "fileId": "1AbC...", "fileName": "notas.docx", "status": "success", "message": "Transferido com sucesso.", "blobName": "notas.docx" }],
    "summary": { "total": 1, "succeeded": 1, "failed": 0 }
  }
}
```

## Deploy no Vercel

1. Importe o repositório em <https://vercel.com/new> (ou rode `npx vercel` na pasta do projeto).
2. Em **Settings → Environment Variables**, cadastre as mesmas variáveis do `.env.local`.
3. Faça um novo deploy para que as variáveis sejam aplicadas.

A rota de transferência declara `maxDuration = 300` segundos. Pastas muito grandes podem passar desse limite; nesse caso, transfira em lotes usando a seleção.

## Segurança

- Credenciais só existem no servidor (variáveis de ambiente + `server-only`).
- Escopo do Google restrito a `drive.readonly`.
- Contêiner criado sem acesso público; as URLs registradas no log não incluem tokens SAS.
- Entrada da API validada (formato dos IDs, limite de 500 por requisição, pertencimento à pasta).
- Erros inesperados retornam mensagem genérica; o detalhe fica só no log do servidor.
- Cabeçalhos de segurança HTTP (`X-Frame-Options`, `X-Content-Type-Options` etc.) em `next.config.mjs`.
- A aplicação não tem login: qualquer pessoa com a URL pode disparar cópias. Para uso além do ambiente de testes, proteja o deploy (ex.: Vercel Deployment Protection).

## Limitações conhecidas

- Subpastas do Drive não são percorridas; apenas os arquivos do primeiro nível são copiados.
- Arquivos com o mesmo nome sobrescrevem o blob existente.
- Exportações de arquivos nativos do Google são limitadas a 10 MB pela API do Drive.
- Formulários, sites e mapas do Google não podem ser exportados e aparecem como "Não suportado".

## Licença

[MIT](LICENSE)
