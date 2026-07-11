# Seguranca de entrada

## Autenticacao inicial

O Don Server usa token estatico via variavel de ambiente para bloquear acesso anonimo enquanto a plataforma ainda roda localmente.

Variaveis:

- `DON_SERVER_TOKEN`: segredo exigido em REST e WebSocket.
- `DON_SERVER_USER_ID`: identificador operacional padrao associado aos eventos autenticados. Padrao: `local-user`.

## REST

Envie o token em um destes formatos:

```http
Authorization: Bearer <DON_SERVER_TOKEN>
```

```http
x-don-token: <DON_SERVER_TOKEN>
```

Opcionalmente, depois que o token for validado, o gateway usa `x-don-user-id` como `actor.userId`:

```http
x-don-user-id: rodcordeiro
```

Rotas sem token valido retornam `401`.

## WebSocket

Clientes Node podem usar header:

```http
Authorization: Bearer <DON_SERVER_TOKEN>
```

Tambem podem enviar:

```http
x-don-user-id: rodcordeiro
```

Clientes browser podem usar query string:

```text
ws://localhost:3001?token=<DON_SERVER_TOKEN>
```

Conexoes sem token valido sao encerradas com politica `1008`.

## Auditoria

Tentativas anonimas, token invalido ou autenticacao nao configurada publicam evento `security.failure`.
O evento registra motivo, canal, caminho e endereco remoto quando disponivel, mas nunca persiste o token recebido.

Eventos originados de comandos autenticados propagam `actor` com:

- `userId`;
- `authMethod`;
- `channel`.

O `x-don-user-id` so e aceito apos token valido e precisa conter ate 80 caracteres entre letras, numeros, `.`, `_`, `@` e `-`.
Se ausente ou invalido, o servidor usa `DON_SERVER_USER_ID`.
