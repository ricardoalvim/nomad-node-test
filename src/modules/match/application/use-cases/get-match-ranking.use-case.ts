import { Injectable, NotFoundException } from '@nestjs/common'
import { MatchRepository } from '../../domain/repositories/match.repository'
import { MatchRankingDto, PlayerRanking } from 'src/shared/interfaces/match.interfaces'
import { MatchEntity } from '../../infra/persistence/model/match.model'

@Injectable()
export class GetMatchRankingUseCase {
  constructor(private readonly matchRepository: MatchRepository) { }

  async execute(matchId: string): Promise<MatchRankingDto> {
    const match: MatchEntity | null = await this.matchRepository.findById(matchId)

    if (!match) {
      throw new NotFoundException(`Partida ${matchId} não encontrada`)
    }

    // Aqui você pode formatar o retorno exatamente como a view precisa
    return {
      matchId: match.matchId,
      winnerWeapon: match.winningWeapon,
      ranking: this.formatRanking(match.players),
    }
  }
  private formatRanking(playersMap: Map<string, any>): PlayerRanking[] {
    const players = Array.from(playersMap.values())

    // Ordena do maior matador para o menor
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
