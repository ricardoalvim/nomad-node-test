import { Injectable } from '@nestjs/common'
import { ParsedMatch } from 'src/shared/interfaces/match.interfaces'
import { PlayerName } from 'src/shared/enum/player.enum'
import { BadgeEngine } from './engines/badge.engine'
import { TimelineEngine } from './engines/timeline.engine'
import { MatchStateManager } from './engines/match-state.manager'

@Injectable()
export class LogParserService {
  private readonly LINE_REGEX = /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - (.*)$/

  constructor(
    private readonly badgeEngine: BadgeEngine,
    private readonly timelineEngine: TimelineEngine,
    private readonly stateManager: MatchStateManager
  ) { }

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
      const timestamp = this.parseDate(dateStr)

      if (action.includes('has started')) {
        const startMatch = action.match(/New match (\d+) has started/)
        if (startMatch) {
          currentMatch = { matchId: startMatch[1], players: {} }
        }
        continue
      }

      if (!currentMatch) continue

      if (action.includes('has ended')) {
        this.finalizeMatch(currentMatch)
        matches.push(currentMatch)
        currentMatch = null
        continue
      }

      // Kill Processing
      this.processAction(currentMatch, action, timestamp)
    }

    return matches
  }

  private processAction(match: ParsedMatch, action: string, timestamp: Date): void {
    const playerKill = action.match(/(.*) killed (.*) using (.*)/)
    const worldKill = action.match(/<WORLD> killed (.*) by/)

    if (playerKill) {
      this.stateManager.registerKill(match, playerKill[1], playerKill[2], playerKill[3], timestamp)
    } else if (worldKill) {
      this.stateManager.registerKill(match, PlayerName.World, worldKill[1], 'environment', timestamp)
    }
  }

  private finalizeMatch(match: ParsedMatch): void {
    match.timeline = this.timelineEngine.analyze(match)

    for (const playerName in match.players) {
      const player = match.players[playerName]
      const { awards, badges } = this.badgeEngine.calculate(match, player)
      player.awards = awards
      player.badges = badges
    }
  }

  private parseDate(dateStr: string): Date {
    const [datePart, timePart] = dateStr.split(' ')
    const [day, month, year] = datePart.split('/')
    return new Date(`${year}-${month}-${day}T${timePart}Z`)
  }
}