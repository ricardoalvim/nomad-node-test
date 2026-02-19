import { Module } from '@nestjs/common'
import { RankingController } from './infra/controllers/ranking.controller'
import { GlobalRankingService } from './application/services/global-ranking.service'
import { MatchProcessedListener } from './application/listeners/match-processed.listener'
import { RedisCacheModule } from 'src/infra/cache/redis-cache.module'

/* 
Módulo de Ranking

* - RankingController: Expõe a API REST para consultar o ranking global
* - GlobalRankingService: Lógica de negócio para calcular e retornar o ranking global
* - MatchProcessedListener: Ouve eventos de partidas processadas para atualizar o ranking no Redis
* - RedisCacheModule: Módulo de cache para armazenar o ranking global atualizado

*/
@Module({
    imports: [RedisCacheModule],
    controllers: [RankingController],
    providers: [GlobalRankingService, MatchProcessedListener],
})
export class RankingModule { }