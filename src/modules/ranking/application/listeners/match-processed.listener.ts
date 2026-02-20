import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { ParsedMatch } from 'src/shared/interfaces/match.interfaces'
import { GlobalRankingService } from '../services/global-ranking.service'

@Injectable()
export class MatchProcessedListener {
  constructor(private readonly globalRankingService: GlobalRankingService) {}

  @OnEvent('match.processed')
  async handleMatchProcessed(match: ParsedMatch) {
    for (const playerName in match.players) {
      const frags = match.players[playerName].frags
      await this.globalRankingService.incrementFrags(playerName, frags)
    }
  }
}
