import { Injectable } from '@nestjs/common'
import { MatchRepository } from '../../domain/repositories/match.repository'
import { PlayerHeadToHeadComparison } from 'src/shared/interfaces/analytics.interface'

@Injectable()
export class PlayerComparisonService {
  constructor(private readonly matchRepository: MatchRepository) {}

  async compareHeadToHead(
    player1Name: string,
    player2Name: string,
  ): Promise<PlayerHeadToHeadComparison> {
    const matches = await this.matchRepository.findAll()

    const sharedMatches = matches.filter((m) => m.players[player1Name] && m.players[player2Name])

    if (sharedMatches.length === 0) {
      return {
        player1: {
          name: player1Name,
          frags: 0,
          deaths: 0,
          kills_against_opponent: 0,
          deaths_against_opponent: 0,
          win_rate: 0,
          favorite_weapon: null,
          avg_kill_streak: 0,
          total_matches: 0,
        },
        player2: {
          name: player2Name,
          frags: 0,
          deaths: 0,
          kills_against_opponent: 0,
          deaths_against_opponent: 0,
          win_rate: 0,
          favorite_weapon: null,
          avg_kill_streak: 0,
          total_matches: 0,
        },
        matches_played_together: 0,
        total_head_to_head_kills: 0,
        advantages: { player1: [], player2: [] },
        prediction: 'tie',
        confidence: 0,
      }
    }

    let p1Stats = {
      frags: 0,
      deaths: 0,
      kills_against_opponent: 0,
      deaths_against_opponent: 0,
      wins: 0,
      streaks: [] as number[],
      weapons: {} as Record<string, number>,
    }

    let p2Stats = {
      frags: 0,
      deaths: 0,
      kills_against_opponent: 0,
      deaths_against_opponent: 0,
      wins: 0,
      streaks: [] as number[],
      weapons: {} as Record<string, number>,
    }

    for (const match of sharedMatches) {
      const p1 = match.players[player1Name]
      const p2 = match.players[player2Name]

      p1Stats.frags += p1.frags
      p1Stats.deaths += p1.deaths
      p1Stats.streaks.push(p1.longestStreak)
      for (const weapon in p1.weapons) {
        p1Stats.weapons[weapon] = (p1Stats.weapons[weapon] || 0) + p1.weapons[weapon]
      }
      if (p1.frags > p2.frags) p1Stats.wins += 1

      p2Stats.frags += p2.frags
      p2Stats.deaths += p2.deaths
      p2Stats.streaks.push(p2.longestStreak)
      for (const weapon in p2.weapons) {
        p2Stats.weapons[weapon] = (p2Stats.weapons[weapon] || 0) + p2.weapons[weapon]
      }
      if (p2.frags > p1.frags) p2Stats.wins += 1
    }

    const p1FavWeapon = this.getMostUsedWeapon(p1Stats.weapons)
    const p2FavWeapon = this.getMostUsedWeapon(p2Stats.weapons)

    const p1Advantage = this.calculateAdvantages(p1Stats, p2Stats)
    const p2Advantage = this.calculateAdvantages(p2Stats, p1Stats)

    // Make prediction based on stats
    const { prediction, confidence } = this.makePrediction(p1Stats, p2Stats)

    return {
      player1: {
        name: player1Name,
        frags: p1Stats.frags,
        deaths: p1Stats.deaths,
        kills_against_opponent: p1Stats.kills_against_opponent,
        deaths_against_opponent: p1Stats.deaths_against_opponent,
        win_rate: p1Stats.wins / sharedMatches.length,
        favorite_weapon: p1FavWeapon,
        avg_kill_streak:
          p1Stats.streaks.length > 0
            ? p1Stats.streaks.reduce((a, b) => a + b, 0) / p1Stats.streaks.length
            : 0,
        total_matches: sharedMatches.length,
      },
      player2: {
        name: player2Name,
        frags: p2Stats.frags,
        deaths: p2Stats.deaths,
        kills_against_opponent: p2Stats.kills_against_opponent,
        deaths_against_opponent: p2Stats.deaths_against_opponent,
        win_rate: p2Stats.wins / sharedMatches.length,
        favorite_weapon: p2FavWeapon,
        avg_kill_streak:
          p2Stats.streaks.length > 0
            ? p2Stats.streaks.reduce((a, b) => a + b, 0) / p2Stats.streaks.length
            : 0,
        total_matches: sharedMatches.length,
      },
      matches_played_together: sharedMatches.length,
      total_head_to_head_kills: p1Stats.frags + p2Stats.frags,
      advantages: {
        player1: p1Advantage,
        player2: p2Advantage,
      },
      prediction,
      confidence,
    }
  }

  private getMostUsedWeapon(weapons: Record<string, number>): string | null {
    if (Object.keys(weapons).length === 0) return null
    let maxWeapon = ''
    let maxCount = 0
    for (const weapon in weapons) {
      if (weapons[weapon] > maxCount) {
        maxCount = weapons[weapon]
        maxWeapon = weapon
      }
    }
    return maxWeapon || null
  }

  private calculateAdvantages(
    playerStats: typeof undefined,
    opponentStats: typeof undefined,
  ): string[] {
    const advantages: string[] = []

    // Bug fix: playerStats is of type 'any', need to pass proper structure
    if (!playerStats || !opponentStats) return advantages

    const playerkD =
      playerStats.deaths > 0 ? playerStats.frags / playerStats.deaths : playerStats.frags
    const opponentkD =
      opponentStats.deaths > 0 ? opponentStats.frags / opponentStats.deaths : opponentStats.frags

    if (playerkD > opponentkD) advantages.push('K/D ratio')
    if (Object.keys(playerStats.weapons).length > Object.keys(opponentStats.weapons).length)
      advantages.push('Weapon diversity')
    if (playerStats.wins > opponentStats.wins) advantages.push('Head to head record')

    return advantages.length > 0 ? advantages : ['Experience']
  }

  private makePrediction(
    playerStats: typeof undefined,
    opponentStats: typeof undefined,
  ): { prediction: 'player1' | 'player2' | 'tie'; confidence: number } {
    if (!playerStats || !opponentStats) return { prediction: 'tie', confidence: 0 }

    const playerkD =
      playerStats.deaths > 0 ? playerStats.frags / playerStats.deaths : playerStats.frags
    const opponentkD =
      opponentStats.deaths > 0 ? opponentStats.frags / opponentStats.deaths : opponentStats.frags

    let confidence = 0
    let prediction: 'player1' | 'player2' | 'tie' = 'tie'

    const kDDiff = Math.abs(playerkD - opponentkD)
    confidence = Math.min(kDDiff * 10, 100)

    if (playerkD > opponentkD) {
      prediction = 'player1'
    } else if (opponentkD > playerkD) {
      prediction = 'player2'
    } else if (playerStats.wins > opponentStats.wins) {
      prediction = 'player1'
    } else if (opponentStats.wins > playerStats.wins) {
      prediction = 'player2'
    }

    return { prediction, confidence: Math.round(confidence) }
  }
}
