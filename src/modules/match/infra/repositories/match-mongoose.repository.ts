import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ParsedMatch } from 'src/shared/interfaces/match.interfaces'
import { MatchRepository } from 'src/modules/match/domain/repositories/match.repository'
import { MatchEntity } from '../persistence/model/match.model'

@Injectable()
export class MatchMongooseRepository implements MatchRepository {
  constructor(@InjectModel(MatchEntity.name) private readonly matchModel: Model<MatchEntity>) { }

  async save(match: ParsedMatch): Promise<void> {
    const entity = new this.matchModel({
      matchId: match.matchId,
      startTime: match.startTime,
      endTime: match.endTime,
      players: match.players,
      winningWeapon: match.winningWeapon || null,
    })

    await entity.save()
  }

  async findById(matchId: string): Promise<MatchEntity | null> {
    return this.matchModel.findOne({ matchId }).exec()
  }

  async findAll(): Promise<MatchEntity[]> {
    return this.matchModel.find().exec()
  }

  async findPlayersInteractions(p1: string, p2: string): Promise<ParsedMatch[]> {
    return this.matchModel.find({
      [`players.${p1}`]: { $exists: true },
      [`players.${p2}`]: { $exists: true }
    }).lean()
  }
}
