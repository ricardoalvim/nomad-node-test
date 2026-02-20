import { Injectable } from '@nestjs/common'
import { ParsedMatch } from 'src/shared/interfaces/match.interfaces'
import { PlayerName } from 'src/shared/enum/player.enum'

@Injectable()
export class MatchStateManager {
  private readonly MAX_PLAYERS = 20

  registerKill(
    match: ParsedMatch,
    killerName: string,
    victimName: string,
    weapon: string,
    timestamp: Date,
  ): void {
    this.ensurePlayerExists(match, victimName)
    const victim = match.players[victimName]

    if (victim) {
      victim.deaths += 1
      victim.currentStreak = 0
    }

    if (killerName === PlayerName.World || killerName === '<WORLD>') {
      return
    }

    this.ensurePlayerExists(match, killerName)
    const killer = match.players[killerName]

    if (killer && victim && killerName !== victimName) {
      const isFriendlyFire = killer.team && victim.team && killer.team === victim.team
      if (isFriendlyFire) {
        killer.frags -= 1
      } else {
        killer.frags += 1
        killer.currentStreak += 1
        if (killer.currentStreak > killer.longestStreak) killer.longestStreak = killer.currentStreak
      }
      killer.weapons[weapon] = (killer.weapons[weapon] || 0) + 1
      killer.killTimestamps.push(timestamp)
    }
  }

  private ensurePlayerExists(match: ParsedMatch, playerName: string): void {
    if (!playerName || playerName === PlayerName.World || playerName === '<WORLD>') return

    if (match.players[playerName]) return

    const currentPlayersCount = Object.keys(match.players).filter(
      (p) => p !== PlayerName.World,
    ).length

    if (currentPlayersCount >= this.MAX_PLAYERS && playerName !== PlayerName.World) {
      return
    }

    match.players[playerName] = {
      name: playerName,
      frags: 0,
      deaths: 0,
      weapons: {},
      currentStreak: 0,
      longestStreak: 0,
      killTimestamps: [],
    }
  }
}
