import { Injectable } from '@nestjs/common'
import { ParsedMatch, ParsedPlayer, TimelineEvent, TimelineEventType } from 'src/shared/interfaces/match.interfaces'
import { Award } from 'src/shared/enum/award.enum'
import { Badge } from 'src/shared/enum/badge.enum'
import { Weapon } from 'src/shared/enum/weapon.enum'
import { PlayerName } from 'src/shared/enum/player.enum'

@Injectable()
export class LogParserService {
  private readonly MAX_PLAYERS_PER_MATCH = 20

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

        if (!killer || !victim) continue

        if (killerName !== victimName) {
          const isFriendlyFire = killer.team && victim.team && killer.team === victim.team

          if (isFriendlyFire) {
            killer.frags -= 1
          } else {
            killer.frags += 1
            killer.currentStreak += 1
            if (killer.currentStreak > killer.longestStreak) {
              killer.longestStreak = killer.currentStreak
            }
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
    match.timeline = this.analyzeTimeline(match)

    for (const playerName in match.players) {
      const player = match.players[playerName]
      const awards: Award[] = []
      const badges: Badge[] = []

      // Awards phase
      if (player.deaths === 0 && player.frags > 0) {
        awards.push(Award.Immortal)
      }

      if (this.hasFastKillsStreak(player.killTimestamps)) {
        awards.push(Award.Rambo)
      }

      // Badges phase
      const calculatedBadges = this.calculateBadges(match, player)
      badges.push(...calculatedBadges)

      player.awards = awards
      player.badges = badges
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

  /**
   * Ensure player exists in match. Throws if exceeding 20 players per match.
   * Initializes new players with default stats (0 frags, 0 deaths, etc.)
   * @throws Error if trying to add player when match has 20+ players
   */
  private ensurePlayerExists(match: ParsedMatch, playerName: string): void {
    if (match.players[playerName]) return;

    const currentPlayersCount = Object.keys(match.players).filter(p => p !== PlayerName.World).length;

    if (currentPlayersCount >= 20 && playerName !== PlayerName.World) {
      // Limited up to 20. We ignore 21th player
      return;
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

  private calculateBadges(match: ParsedMatch, player: ParsedPlayer): Badge[] {
    const badges: Badge[] = []

    if (player.longestStreak >= 10) {
      badges.push(Badge.Unstoppable)
    }

    if (player.deaths === 0 && player.frags >= 10) {
      badges.push(Badge.Flawless)
    }

    if (player.deaths === 0 && player.frags > 0) {
      let isWinner = true
      for (const otherName in match.players) {
        if (otherName !== player.name && match.players[otherName].frags > player.frags) {
          isWinner = false
          break
        }
      }
      if (isWinner) {
        badges.push(Badge.Perfect)
      }
    }

    const totalKills = Object.values(player.weapons).reduce((a, b) => a + b, 0)
    if (totalKills > 0) {
      for (const weapon in player.weapons) {
        if (player.weapons[weapon] / totalKills >= 0.8) {
          badges.push(Badge.RifleKing)
          break
        }
      }
    }

    if (Object.keys(player.weapons).length >= 3) {
      badges.push(Badge.Arsenal)
    }

    if (this.hasBlitzKills(player.killTimestamps)) {
      badges.push(Badge.Blitz)
    }

    return badges
  }

  private analyzeTimeline(match: ParsedMatch): TimelineEvent[] {
    const events: TimelineEvent[] = []
    const playerStates = new Map<string, { frags: number; deaths: number }>()

    for (const playerName in match.players) {
      playerStates.set(playerName, { frags: 0, deaths: 0 })
    }

    const killEvents: { timestamp: Date; killer: string; victim: string; weapon: string }[] = []
    for (const playerName in match.players) {
      const player = match.players[playerName]
      for (const timestamp of player.killTimestamps) {
        killEvents.push({
          timestamp,
          killer: playerName,
          victim: '',
          weapon: '',
        })
      }
    }

    killEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    let lastStreakPlayer = ''
    const streakCounts = new Map<string, number>()

    for (const player of Object.values(match.players)) {
      if (player.killTimestamps.length > 0) {
        events.push({
          timestamp: player.killTimestamps[0],
          type: TimelineEventType.FirstBlood,
          description: `${player.name} drew first blood`,
          players: [player.name],
          severity: 'medium',
        })
      }

      if (player.longestStreak >= 3) {
        const streakStart = player.killTimestamps[0]
        events.push({
          timestamp: streakStart,
          type: TimelineEventType.KillStreak,
          description: `${player.name} initiated a ${player.longestStreak} kill streak`,
          players: [player.name],
          severity: player.longestStreak >= 5 ? 'high' : 'medium',
        })
      }

      if (player.killTimestamps.length >= 4) {
        const recent4 = player.killTimestamps.slice(-4)
        const timeDiff = recent4[3].getTime() - recent4[0].getTime()
        if (timeDiff <= 30000) {
          events.push({
            timestamp: recent4[0],
            type: TimelineEventType.IntenseAction,
            description: `Intense action: ${player.name} got 4 kills in 30 seconds`,
            players: [player.name],
            severity: 'high',
          })
        }
      }
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  private hasBlitzKills(killTimestamps: Date[]): boolean {
    if (killTimestamps.length < 7) return false
    const sorted = [...killTimestamps].sort((a, b) => a.getTime() - b.getTime())
    for (let i = 6; i < sorted.length; i++) {
      const diff = sorted[i].getTime() - sorted[i - 6].getTime()
      if (diff <= 30000) return true
    }
    return false
  }

  private parseDate(dateStr: string): Date {
    const [datePart, timePart] = dateStr.split(' ')
    const [day, month, year] = datePart.split('/')
    return new Date(`${year}-${month}-${day}T${timePart}Z`)
  }
}