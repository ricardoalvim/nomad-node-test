import { Module } from '@nestjs/common'
import { RankingController } from './infra/controllers/ranking.controller'
import { GlobalRankingService } from './application/services/global-ranking.service'
import { MatchProcessedListener } from './application/listeners/match-processed.listener'
import { RedisCacheModule } from 'src/infra/cache/redis-cache.module'

@Module({
    imports: [RedisCacheModule],
    controllers: [RankingController],
    providers: [GlobalRankingService, MatchProcessedListener],
})
export class RankingModule { }