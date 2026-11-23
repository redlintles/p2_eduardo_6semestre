# Criando a Service Account do Google

Passo a passo para gerar as credenciais usadas em `GOOGLE_SERVICE_ACCOUNT_BASE64` e `GOOGLE_DRIVE_FOLDER_ID`.

## 1. Projeto e API

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie (ou selecione) um projeto.
2. Em **APIs e serviços → Biblioteca**, procure **Google Drive API** e clique em **Ativar**.

## 2. Service Account

1. Em **IAM e administrador → Contas de serviço**, clique em **Criar conta de serviço**.
2. Dê um nome (ex.: `drive-to-blob`) e conclua. Nenhum papel do projeto é necessário.
3. Abra a conta criada, vá na aba **Chaves → Adicionar chave → Criar nova chave → JSON**.
4. Um arquivo `.json` será baixado. **Não o coloque dentro do repositório.**

Anote o campo `client_email` do JSON, algo como `drive-to-blob@seu-projeto.iam.gserviceaccount.com`.

## 3. Compartilhar a pasta do Drive

A Service Account é um usuário separado: ela só enxerga o que for compartilhado com ela.

1. No Google Drive, clique com o botão direito na pasta de origem → **Compartilhar**.
2. Cole o `client_email` e conceda o papel **Leitor**.
3. Abra a pasta e copie o ID da URL:

   ```
   https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
                                          └──────── folder ID ────────┘
   ```

## 4. Gerar o Base64

```bash
# Linux
base64 -w 0 service-account.json

# macOS
base64 -i service-account.json | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

Cole o resultado em `GOOGLE_SERVICE_ACCOUNT_BASE64` no `.env.local` e nas variáveis do Vercel.

O JSON vai em Base64 porque a chave privada tem quebras de linha, que costumam se corromper quando coladas em variáveis de ambiente.

## Problemas comuns

| Mensagem                                   | Causa provável                                       |
| ------------------------------------------ | ---------------------------------------------------- |
| `GOOGLE_SERVICE_ACCOUNT_BASE64 é inválida` | Base64 incompleto ou gerado com quebras de linha.    |
| `A pasta de origem não foi encontrada...`  | Pasta não compartilhada com o `client_email`, ou ID incorreto. |
| `Insufficient Permission` / código 403     | Drive API não ativada no projeto da Service Account. |
| `Falha na comunicação com o Google Drive`  | Drive API não ativada no projeto, ou ID incorreto.   |
