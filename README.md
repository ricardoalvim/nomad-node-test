# Nomad FPS Log Parser 

API robusta desenvolvida em NestJS para processamento de logs de jogos FPS, geração de rankings em tempo real e analytics avançado de jogadores.

## Arquitetura e Decisões Técnicas
- Clean Architecture: Separação clara entre Domínio, Casos de Uso (Application) e Infraestrutura.
- Event-Driven: Utilização do EventEmitter do NestJS para desacoplar o processamento de logs da atualização do Ranking Global.
- High Performance Ranking: O Ranking Global utiliza Redis (Sorted Sets), permitindo consultas instantâneas $O(1)$ sem onerar o banco de dados principal.
- Analytics Engine: Módulo dedicado para comparação Head-to-Head (H2H) entre jogadores, com cálculos de win rate, vantagens competitivas e predições baseadas em K/D.
- Resiliência: Tratamento de Friendly Fire (pontuação negativa) e limite rigoroso de 20 jogadores por partida.

## Tecnologias
- Node.js & NestJS (TypeScript)
- MongoDB (Persistência de partidas)
- Redis (Ranking Global e Cache)
- Jest (100% de Test Coverage em módulos críticos)
- Swagger (Documentação da API)

# Como rodarBash# Iniciar infraestrutura (Mongo e Redis)
docker-compose up -d

# Instalar dependências
npm install

# Rodar em modo dev
npm run start:dev

# Rodar testes com coverage
npm run test:cov
Acesse a documentação interativa em: http://localhost:3000/api/docs