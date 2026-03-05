# 🎓 Portal de Inscrições Fametro 2026/1 + Sistema de Tickets

![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

Portal de inscrições para a Faculdade Fametro (semestre 2026/1) e sistema interno de tickets para funcionários do call center. Desenvolvido com HTML, CSS e JavaScript puro, integrado ao Firebase para autenticação e armazenamento.

🔗 **Acesse o site:** [https://kauansntz.github.io/portal-inscricoes/](https://kauansntz.github.io/portal-inscricoes/)

---

## ✨ Funcionalidades

### 🏠 Página Inicial (`portal.html`)
- Lista de unidades (SEDE, LESTE, SUL, NORTE, OESTE)
- Links de inscrição por modalidade:
  - Presencial
  - Híbrido
  - Semipresencial
  - Semipresencial Flex
  - EAD (100% online)
- Temas personalizados por unidade (cores diferentes)
- Botão "Pesquisar cursos" por unidade

### 🔍 Central de Links (`links.html`)
- Busca e filtros por:
  - Unidade
  - Modalidade
  - Tipo de ingresso (Vestibular/Matrícula)
- Dados vindos de JSON + fallback JavaScript
- Controle de qualidade com exibição de métricas

### 💰 Pesquisa de Preços (Modal Global)
- Consulta de valores por:
  - Unidade (Manaus, Compensa, Pará, Polos Próprios)
  - Modalidade (Presencial, Híbrido, Semipresencial, EAD)
  - Plano (ENEM/Vestibular, Portador/Transferência)
- Botão "Copiar mensagem" com informações formatadas
- Valores armazenados em `course_prices_2026_1_data.js`

### 🎫 Sistema de Tickets
- **Páginas:** `tickets.html`, `novo-ticket.html`, `meus-tickets.html`, `admin-tickets.html`, `admin-users.html`
- Autenticação com Firebase Auth
- Perfis de usuário:
  - **Comum:** cria e acompanha seus próprios tickets
  - **Admin:** gerencia tickets em andamento
  - **Super Admin:** gerencia usuários e permissões
- Badges com contagem de tickets (abertos/em andamento)
- Notificações sonoras ao receber novos tickets

### 🎨 Interface e Experiência
- **Modo escuro** com alternância por botão
- **Seletor de temas:** azul (padrão), rosa, vermelho, verde, amarelo, laranja
- **Menu lateral (hambúrguer)** com:
  - Navegação principal
  - Submenu "Informações" (Setores e Coordenação)
  - Submenu "Tema"
  - Perfil do usuário (nome + e-mail)
  - Botão "Sair"
- **Modais responsivos** para pesquisa de cursos e preços
- Scrollbars personalizadas
- Totalmente responsivo para mobile

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
|------------|-----------|
| **HTML5** | Estrutura das páginas |
| **CSS3** | Estilização, variáveis CSS, temas dinâmicos |
| **JavaScript (ES6+)** | Lógica do front-end, modais, eventos |
| **Firebase** | Autenticação, Firestore (banco de dados) |
| **GitHub Pages** | Hospedagem do site estático |
| **Font Awesome** (opcional) | Ícones (se usado) |
