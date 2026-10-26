# API do portal em Google Apps Script

`Code.gs` substitui a API Express do Render: o site (GitHub Pages) chama este script
via `assets/js/portal-api.js`, e o script lê/grava direto na planilha "Banco de Dados".
Não precisa de servidor, de conta de serviço nem de planilha pública.

## Publicar (uma vez)

1. Abra a planilha **Banco de Dados** → **Extensões → Apps Script**.
2. Apague o conteúdo de `Código.gs`, cole o conteúdo de `apps-script/Code.gs` e salve.
3. **Implantar → Nova implantação** → engrenagem → **App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
4. **Implantar** e autorize. Se aparecer "o Google não verificou este app":
   **Avançado → Acessar (não seguro)**. É o seu próprio script.
5. Copie a **URL do app da Web** (termina em `/exec`) e cole em
   `assets/js/portal-api.js`, na constante `PORTAL_API_URL`.

Teste no navegador: `<URL>?route=processos&limit=2` deve mostrar
`{"status":200,"body":{"total":...}}`.

## Erro "Você não tem permissão para chamar UrlFetchApp.fetch"

A conta que publicou não autorizou chamadas externas (usadas para validar o login).
No editor do Apps Script, escolha a função **`autorizar`** na barra de cima → **▶ Executar** →
**Revisar permissões** → escolha a conta → **Avançado → Acessar** → **marque todas as caixas**
(principalmente "Conectar a um serviço externo") → **Permitir**. Depois publique uma nova versão
(abaixo). Se não aparecer a tela de permissões: myaccount.google.com/permissions → remova o
acesso do script e rode `autorizar` de novo.

## Atualizar o script depois

**Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar.**
Assim a URL continua a mesma. ("Nova implantação" gera outra URL.)

## Depois que o site estiver usando o script

- **Compartilhar → Acesso geral → Restrito**: a planilha deixa de ser pública
  (o diário de bordo tem CPF e telefone).
- Remova o acesso de `sheets-api@portal-inscricoes-api.iam.gserviceaccount.com`:
  a API antiga do Render deixa de conseguir ler e gravar.

## Observações

- O script roda com a conta de quem publicou. Se essa conta perder o acesso de
  edição à planilha, a API para.
- Login: o token do Firebase é conferido lendo `users/{uid}` no Firestore com o
  próprio token. As regras do Firestore precisam deixar o usuário ler o próprio doc
  (já é assim hoje).
- Limites do Apps Script (conta gratuita): 6 min por execução e ~20 mil chamadas
  de URL externas por dia. As leituras públicas ficam em cache por 60 s.
