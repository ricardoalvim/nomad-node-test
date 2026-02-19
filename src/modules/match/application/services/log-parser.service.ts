import { Injectable } from '@nestjs/common'
import { ParsedMatch, ParsedPlayer } from 'src/shared/interfaces/match.interfaces'
import { Award } from 'src/shared/enum/award.enum'
import { Weapon } from 'src/shared/enum/weapon.enum'

@Injectable()
export class LogParserService {
  private readonly LINE_REGEX = /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - (.*)$/
  private readonly MATCH_START_REGEX = /New match (\d+) has started/
  private readonly MATCH_END_REGEX = /Match (\d+) has ended/
  private readonly WORLD_KILL_REGEX = /<WORLD> killed (.*) by/
  private readonly PLAYER_KILL_REGEX = /(.*) killed (.*) using (.*)/

  parseLogContent(content: string): ParsedMatch[] {
    const lines = content.split('\n')
    const matches: ParsedMatch[] = []
    let currentMatch: ParsedMatch | null = null

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue

      const lineMatch = line.match(this.LINE_REGEX)
      if (!lineMatch) continue

      const dateStr = lineMatch[1]
      const action = lineMatch[2]

      const startMatch = action.match(this.MATCH_START_REGEX)
      if (startMatch) {
        currentMatch = {
          matchId: startMatch[1],
          players: {},
        }
        continue
      }

      if (!currentMatch) continue

      const endMatch = action.match(this.MATCH_END_REGEX)
      if (endMatch) {
        this.enrichMatchData(currentMatch)
        matches.push(currentMatch)
        currentMatch = null
        continue
      }

      const worldKillMatch = action.match(this.WORLD_KILL_REGEX)
      if (worldKillMatch) {
        const victimName = worldKillMatch[1]
        this.ensurePlayerExists(currentMatch, victimName)

        const victim = currentMatch.players[victimName]
        victim.deaths += 1
        victim.currentStreak = 0
        continue
      }

      const playerKillMatch = action.match(this.PLAYER_KILL_REGEX)
      if (playerKillMatch) {
        const killerName = playerKillMatch[1]
        const victimName = playerKillMatch[2]
        const weapon = playerKillMatch[3]

        this.ensurePlayerExists(currentMatch, killerName)
        this.ensurePlayerExists(currentMatch, victimName)

        const killer = currentMatch.players[killerName]
        const victim = currentMatch.players[victimName]

        if (killerName !== victimName) {
          killer.frags += 1
          killer.currentStreak += 1
          if (killer.currentStreak > killer.longestStreak) {
            killer.longestStreak = killer.currentStreak
          }
          killer.weapons[weapon] = (killer.weapons[weapon] || 0) + 1
          killer.killTimestamps.push(this.parseDate(dateStr))
        }

        victim.deaths += 1
        victim.currentStreak = 0
        continue
      }
    }

    return matches
  }

  private enrichMatchData(match: ParsedMatch): void {
    match.winningWeapon = this.getWinningWeapon(match)

    for (const playerName in match.players) {
      const player = match.players[playerName]
      const awards: string[] = []

      if (player.deaths === 0 && player.frags > 0) {
        awards.push(Award.Immortal)
      }

      if (this.hasFastKillsStreak(player.killTimestamps)) {
        awards.push(Award.Rambo)
      }
      ; (player as any).awards = awards
    }
  }

  private getWinningWeapon(match: ParsedMatch): Weapon | null {
    let winner: ParsedPlayer | null = null
    let maxFrags = -1

    for (const playerName in match.players) {
      const player = match.players[playerName]
      if (player.frags > maxFrags) {
        maxFrags = player.frags
        winner = player
      }
    }

    if (!winner || Object.keys(winner.weapons).length === 0) return null

    let bestWeapon: string | null = null
    let maxWeaponKills = -1

    for (const weapon in winner.weapons) {
      if (winner.weapons[weapon] > maxWeaponKills) {
        maxWeaponKills = winner.weapons[weapon]
        bestWeapon = weapon
      }
    }
    return bestWeapon as Weapon | null
  }

  private hasFastKillsStreak(killTimestamps: Date[]): boolean {
    if (killTimestamps.length < 5) return false
    const sorted = [...killTimestamps].sort((a, b) => a.getTime() - b.getTime())
    for (let i = 4; i < sorted.length; i++) {
      const diff = sorted[i].getTime() - sorted[i - 4].getTime()
      if (diff <= 60000) return true
    }
    return false
  }

  private ensurePlayerExists(match: ParsedMatch, playerName: string) {
    if (!match.players[playerName]) {
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

  private parseDate(dateStr: string): Date {
    const [datePart, timePart] = dateStr.split(' ')
    const [day, month, year] = datePart.split('/')
    return new Date(`${year}-${month}-${day}T${timePart}Z`)
  }
}