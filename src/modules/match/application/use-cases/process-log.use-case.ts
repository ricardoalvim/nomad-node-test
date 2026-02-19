import { Injectable } from '@nestjs/common'
import { LogParserService } from '../services/log-parser.service'
import { ParsedMatch } from 'src/shared/interfaces/match.interfaces'
import { Weapon } from 'src/shared/weapon.enum'
import { Award } from 'src/shared/award.enum'
import { MatchRepository } from '../../domain/repositories/match.repository'

@Injectable()
export class ProcessLogUseCase {
  constructor(
    private readonly logParserService: LogParserService,
    private readonly matchRepository: MatchRepository,
  ) { }

  async execute(fileBuffer: Buffer): Promise<void> {
    const fileContent = fileBuffer.toString('utf-8')
    const parsedMatches = this.logParserService.parseLogContent(fileContent)

    for (const match of parsedMatches) {
      this.applyBusinessRulesAndAwards(match)
      const winningWeapon = this.getWinningWeapon(match)

      await this.matchRepository.save(match, winningWeapon)
    }
  }

  private applyBusinessRulesAndAwards(match: ParsedMatch): void {
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

  private hasFastKillsStreak(killTimestamps: Date[]): boolean {
    if (killTimestamps.length < 5) return false

    const sortedTimestamps = [...killTimestamps].sort((a, b) => a.getTime() - b.getTime())

    for (let i = 4; i < sortedTimestamps.length; i++) {
      const timeDiffMs = sortedTimestamps[i].getTime() - sortedTimestamps[i - 4].getTime()
      if (timeDiffMs <= 60000) {
        return true
      }
    }

    return false
  }

  private getWinningWeapon(match: ParsedMatch): Weapon | null {
    let winner = null
    let maxFrags = -1

    for (const playerName in match.players) {
      const player = match.players[playerName]
      if (player.frags > maxFrags) {
        maxFrags = player.frags
        winner = player
      }
    }

    if (!winner || Object.keys(winner.weapons).length === 0) return null

    let bestWeapon: Weapon | null = null
    let maxWeaponKills = -1

    for (const weapon in winner.weapons) {
      if (winner.weapons[weapon] > maxWeaponKills) {
        maxWeaponKills = winner.weapons[weapon]
        bestWeapon = weapon as Weapon
      }
    }

    return bestWeapon
  }
}
