import { Injectable } from '@nestjs/common'
import { PlayerHeadToHeadComparison } from 'src/shared/interfaces/analytics.interface'

@Injectable()
export class PlayerComparisonService {
  async compareHeadToHead(
    p1Name: string,
    p2Name: string,
    sharedMatches: any[]
  ): Promise<PlayerHeadToHeadComparison> {

    if (!sharedMatches || sharedMatches.length === 0) {
      return this.generateDefaultResponse(p1Name, p2Name)
    }

    let p1Stats = { frags: 0, deaths: 0, wins: 0, streaks: [] as number[], weapons: {} as Record<string, number> }
    let p2Stats = { frags: 0, deaths: 0, wins: 0, streaks: [] as number[], weapons: {} as Record<string, number> }

    for (const match of sharedMatches) {
      const p1 = match.players[p1Name]
      const p2 = match.players[p2Name]

      p1Stats.frags += p1.frags
      p1Stats.deaths += p1.deaths
      p1Stats.streaks.push(p1.longestStreak)
      Object.keys(p1.weapons).forEach(w => p1Stats.weapons[w] = (p1Stats.weapons[w] || 0) + p1.weapons[w])

      p2Stats.frags += p2.frags
      p2Stats.deaths += p2.deaths
      p2Stats.streaks.push(p2.longestStreak)
      Object.keys(p2.weapons).forEach(w => p2Stats.weapons[w] = (p2Stats.weapons[w] || 0) + p2.weapons[w])

      if (p1.frags > p2.frags) p1Stats.wins++
      else if (p2.frags > p1.frags) p2Stats.wins++
    }

    const p1Fav = this.getMostUsedWeapon(p1Stats.weapons)
    const p2Fav = this.getMostUsedWeapon(p2Stats.weapons)
    const { prediction, confidence } = this.makePrediction(p1Stats, p2Stats)

    return {
      player1: {
        name: p1Name,
        frags: p1Stats.frags,
        deaths: p1Stats.deaths,
        kills_against_opponent: 0,
        deaths_against_opponent: 0,
        win_rate: p1Stats.wins / sharedMatches.length,
        favorite_weapon: p1Fav,
        avg_kill_streak: p1Stats.streaks.reduce((a, b) => a + b, 0) / p1Stats.streaks.length,
        total_matches: sharedMatches.length
      },
      player2: {
        name: p2Name,
        frags: p2Stats.frags,
        deaths: p2Stats.deaths,
        kills_against_opponent: 0,
        deaths_against_opponent: 0,
        win_rate: p2Stats.wins / sharedMatches.length,
        favorite_weapon: p2Fav,
        avg_kill_streak: p2Stats.streaks.reduce((a, b) => a + b, 0) / p2Stats.streaks.length,
        total_matches: sharedMatches.length
      },
      matches_played_together: sharedMatches.length,
      total_head_to_head_kills: p1Stats.frags + p2Stats.frags,
      advantages: {
        player1: this.calculateAdvantages(p1Stats, p2Stats),
        player2: this.calculateAdvantages(p2Stats, p1Stats)
      },
      prediction: prediction as 'player1' | 'player2' | 'tie',
      confidence
    }
  }

  private getMostUsedWeapon(weapons: Record<string, number>): string | null {
    const keys = Object.keys(weapons)
    return keys.length ? keys.reduce((a, b) => weapons[a] > weapons[b] ? a : b) : null
  }

  private calculateAdvantages(p: any, o: any): string[] {
    const adv = []
    if ((p.frags / (p.deaths || 1)) > (o.frags / (o.deaths || 1))) adv.push('K/D ratio')
    if (p.wins > o.wins) adv.push('Head to head record')
    return adv.length ? adv : ['Experience']
  }

  private makePrediction(p: any, o: any) {
    const pkd = p.frags / (p.deaths || 1)
    const okd = o.frags / (o.deaths || 1)
    const prediction = pkd > okd ? 'player1' : (okd > pkd ? 'player2' : 'tie')
    return { prediction, confidence: Math.min(Math.round(Math.abs(pkd - okd) * 20), 100) }
  }

  private generateDefaultResponse(p1: string, p2: string): PlayerHeadToHeadComparison {
    const empty = (n: string) => ({ name: n, frags: 0, deaths: 0, kills_against_opponent: 0, deaths_against_opponent: 0, win_rate: 0, favorite_weapon: null, avg_kill_streak: 0, total_matches: 0 })
    return { player1: empty(p1), player2: empty(p2), matches_played_together: 0, total_head_to_head_kills: 0, advantages: { player1: [], player2: [] }, prediction: 'tie', confidence: 0 }
  }
}