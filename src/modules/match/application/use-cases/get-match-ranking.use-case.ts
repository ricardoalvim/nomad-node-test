import { Injectable, NotFoundException } from '@nestjs/common'
import { MatchEntity } from '../../infra/persistence/model/match.model'
import { PlayerRanking } from 'src/shared/interfaces/player.interface'
import { MatchRankingDto } from 'src/shared/interfaces/ranking.interface'
import { MatchRepository } from '../../domain/repositories/match.repository'

@Injectable()
export class GetMatchRankingUseCase {
  constructor(private readonly matchRepository: MatchRepository) { }

  async execute(matchId: string): Promise<MatchRankingDto> {
    const match: MatchEntity | null = await this.matchRepository.findById(matchId)

    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found`)
    }

    return {
      matchId: match.matchId,
      winnerWeapon: match.winningWeapon,
      ranking: this.formatRanking(match.players),
    }
  }
  private formatRanking(playersMap: Map<string, any>): PlayerRanking[] {
    const players = Array.from(playersMap.values())

    return players
      .sort((a: any, b: any) => b.frags - a.frags)
      .map((p: any) => ({
        name: p.name,
        frags: p.frags,
        deaths: p.deaths,
        longestStreak: p.longestStreak,
        awards: p.awards,
      })) as PlayerRanking[]
  }
}
