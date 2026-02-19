import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ParsedMatch } from 'src/modules/match/application/services/log-parser.service'
import { MatchRepository } from 'src/modules/match/domain/repositories/match.repository'
import { MatchEntity } from 'src/modules/match/infra/persistence/match.schema'

@Injectable()
export class MatchMongooseRepository implements MatchRepository {
    constructor(
        @InjectModel(MatchEntity.name) private readonly matchModel: Model<MatchEntity>,
    ) { }

    async save(match: ParsedMatch, winningWeapon: string | null): Promise<void> {
        await this.matchModel.findOneAndUpdate(
            { matchId: match.matchId },
            {
                matchId: match.matchId,
                startTime: new Date(),
                players: match.players,
                winningWeapon,
            },
            { upsert: true, new: true },
        )
    }

    async findById(matchId: string): Promise<MatchEntity | null> {
        return this.matchModel.findOne({ matchId }).exec()
    }

    async findAll(): Promise<MatchEntity[]> {
        return this.matchModel.find().exec()
    }
}