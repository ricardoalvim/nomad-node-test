import { Module } from '@nestjs/common'
import { RankingController } from './infra/controllers/ranking.controller'
import { GlobalRankingService } from './application/services/global-ranking.service'
import { MatchProcessedListener } from './application/listeners/match-processed.listener'
import { RedisCacheModule } from 'src/infra/cache/redis-cache.module'

/*
Ranking Module

* - RankingController: Exposes REST API for querying global ranking
* - GlobalRankingService: Business logic for calculating and returning global ranking
* - MatchProcessedListener: Listens to processed match events to update ranking in Redis
* - RedisCacheModule: Cache module for storing updated global ranking

*/
@Module({
    imports: [RedisCacheModule],
    controllers: [RankingController],
    providers: [GlobalRankingService, MatchProcessedListener],
})
export class RankingModule { }