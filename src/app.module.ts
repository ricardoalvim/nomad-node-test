import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './infra/database/database.module'
import { RedisCacheModule } from './infra/cache/redis-cache.module'
import { MatchModule } from './modules/match/match.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    RedisCacheModule,
    MatchModule,
  ],
})
export class AppModule {}
