import { Injectable, NotFoundException } from '@nestjs/common'
import { MatchRepository } from '../../domain/repositories/match.repository'
import { ParsedMatch, ParsedPlayer } from 'src/shared/interfaces/match.interfaces'

@Injectable()
export class GetMatchDetailsUseCase {
    constructor(private readonly matchRepository: MatchRepository) { }

    async execute(matchId: string): Promise<ParsedMatch> {
        const match = await this.matchRepository.findById(matchId)

        if (!match) {
            throw new NotFoundException(`Match with id ${matchId} not found`)
        }
        const playersRecord: Record<string, ParsedPlayer> = {}

        if (match.players) {
            match.players.forEach((playerStats, playerName) => {
                playersRecord[playerName] = playerStats as unknown as ParsedPlayer
            })
        }
        return {
            matchId: match.matchId,
            winningWeapon: match.winningWeapon,
            players: playersRecord,
        } as ParsedMatch
    }
}