import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MatchController } from './infra/controllers/match.controller'
import { AnalyticsController } from './infra/controllers/analytics.controller'
import { MatchSchema } from './infra/persistence/match.schema'
import { MatchRepository } from './domain/repositories/match.repository'
import { MatchMongooseRepository } from './infra/repositories/match-mongoose.repository'
import { LogParserService } from './application/services/log-parser.service'
import { ProcessLogUseCase } from './application/use-cases/process-log.use-case'
import { GetMatchRankingUseCase } from './application/use-cases/get-match-ranking.use-case'
import { GetMatchDetailsUseCase } from './application/use-cases/get-match-details.use-case'
import { PlayerComparisonService } from './application/services/player-comparison.service'
import { GetPlayerComparisonUseCase } from './application/use-cases/get-player-comparison.use-case'
import { MatchEntity } from './infra/persistence/model/match.model'
import { BadgeEngine } from './application/services/engines/badge.engine'
import { MatchStateManager } from './application/services/engines/match-state.manager'
import { TimelineEngine } from './application/services/engines/timeline.engine'

/* 
  The MatchModule is the central module that orchestrates all match-related functionality. 
  Inclui:
  - Persistence: MongoDB schema e repository
  - Services: LogParserService, PlayerComparisonService
  - Use Cases: ProcessLogUseCase, GetMatchDetailsUseCase, GetMatchRankingUseCase, GetPlayerComparisonUseCase
  - Controllers: MatchController (matches endpoints), AnalyticsController (analytics endpoints)
*/
@Module({
  imports: [MongooseModule.forFeature([{ name: MatchEntity.name, schema: MatchSchema }])],
  providers: [
    {
      provide: MatchRepository,
      useClass: MatchMongooseRepository,
    },
    LogParserService,
    BadgeEngine,
    TimelineEngine,
    MatchStateManager,
    ProcessLogUseCase,
    GetMatchRankingUseCase,
    GetMatchDetailsUseCase,
    PlayerComparisonService,
    GetPlayerComparisonUseCase,
  ],
  controllers: [MatchController, AnalyticsController],
})
export class MatchModule { }
