import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MatchController } from './infra/controllers/match.controller'
import { MatchEntity, MatchSchema } from './infra/persistence/match.schema'
import { MatchRepository } from './domain/repositories/match.repository'
import { MatchMongooseRepository } from './infra/repositories/match-mongoose.repository'

@Module({
  imports: [MongooseModule.forFeature([{ name: MatchEntity.name, schema: MatchSchema }])],
  providers: [
    {
      provide: MatchRepository,
      useClass: MatchMongooseRepository,
    },
  ],
  controllers: [MatchController],
})
export class MatchModule {}
