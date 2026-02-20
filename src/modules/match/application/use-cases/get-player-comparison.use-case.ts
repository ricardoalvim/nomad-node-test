import { Injectable, BadRequestException } from '@nestjs/common'
import { PlayerHeadToHeadComparison } from 'src/shared/interfaces/analytics.interface'
import { PlayerComparisonService } from '../services/player-comparison.service'
import { MatchRepository } from '../../domain/repositories/match.repository'

@Injectable()
export class GetPlayerComparisonUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly comparisonService: PlayerComparisonService
  ) { }

  async execute(player1: string, player2: string): Promise<PlayerHeadToHeadComparison> {
    if (!player1 || !player2) {
      throw new BadRequestException('Both player names are required')
    }
    if (player1 === player2) {
      throw new BadRequestException('Players must be different')
    }

    const matches = await this.matchRepository.findPlayersInteractions(player1, player2)
    return this.comparisonService.compareHeadToHead(player1, player2, matches)
  }
}
