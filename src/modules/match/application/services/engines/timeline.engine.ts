import { Injectable } from '@nestjs/common'
import {
  ParsedMatch,
  TimelineEvent,
  TimelineEventType,
} from 'src/shared/interfaces/match.interfaces'

@Injectable()
export class TimelineEngine {
  analyze(match: ParsedMatch): TimelineEvent[] {
    const events: TimelineEvent[] = []
    const allPlayers = Object.values(match.players)

    for (const player of allPlayers) {
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
        events.push({
          timestamp: player.killTimestamps[0],
          type: TimelineEventType.KillStreak,
          description: `${player.name} initiated a ${player.longestStreak} kill streak`,
          players: [player.name],
          severity: player.longestStreak >= 5 ? 'high' : 'medium',
        })
      }

      if (this.hasIntenseAction(player.killTimestamps, 4, 30000)) {
        events.push({
          timestamp: player.killTimestamps[0],
          type: TimelineEventType.IntenseAction,
          description: `Intense action: ${player.name} got 4 kills in 30 seconds`,
          players: [player.name],
          severity: 'high',
        })
      }
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  private hasIntenseAction(timestamps: Date[], count: number, windowMs: number): boolean {
    if (timestamps.length < count) return false
    for (let i = count - 1; i < timestamps.length; i++) {
      if (timestamps[i].getTime() - timestamps[i - (count - 1)].getTime() <= windowMs) return true
    }
    return false
  }
}
