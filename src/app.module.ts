import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './infra/database/database.module'
import { RedisCacheModule } from './infra/cache/redis-cache.module'
import { MatchModule } from './modules/match/match.module'
import { RankingModule } from './modules/ranking/ranking.module'
import { EventEmitterModule } from '@nestjs/event-emitter'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    RedisCacheModule,
    MatchModule,
    RankingModule,
  ],
})
export class AppModule {}
