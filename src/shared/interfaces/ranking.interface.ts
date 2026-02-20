import { PlayerRanking } from './player.interface'

export interface GlobalPlayerRanking {
  name: string
  totalFrags: number
}

export interface MatchRankingDto {
  matchId: string
  winnerWeapon: string | null
  ranking: PlayerRanking[]
}
