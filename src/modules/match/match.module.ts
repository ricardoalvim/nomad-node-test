import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MatchController } from './infra/controllers/match.controller'
import { MatchEntity, MatchSchema } from './infra/persistence/match.schema'
import { MatchRepository } from './domain/repositories/match.repository'
import { MatchMongooseRepository } from './infra/repositories/match-mongoose.repository'

/* 
  O MatchModule é o módulo central que orquestra toda a funcionalidade relacionada às partidas. 
  Ele importa o esquema do Mongoose para a entidade de partida, define o repositório concreto que será usado para persistência e registra o controlador que expõe as rotas da API.
*/
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
export class MatchModule { }
