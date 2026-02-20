import { Injectable } from '@nestjs/common'
import { ParsedMatch, ParsedPlayer } from 'src/shared/interfaces/match.interfaces'
import { PlayerName } from 'src/shared/enum/player.enum'

@Injectable()
export class MatchStateManager {
    private readonly MAX_PLAYERS = 20

    registerKill(match: ParsedMatch, killerName: string, victimName: string, weapon: string, timestamp: Date): void {
        this.ensurePlayerExists(match, killerName)
        this.ensurePlayerExists(match, victimName)

        const killer = match.players[killerName]
        const victim = match.players[victimName]

        if (!killer || !victim) return

        if (killerName === PlayerName.World) {
            this.handleWorldKill(victim)
        } else if (killerName !== victimName) {
            this.handlePlayerKill(killer, victim, weapon, timestamp)
        } else {
            victim.deaths += 1
            victim.currentStreak = 0
        }
    }

    private handleWorldKill(victim: ParsedPlayer): void {
        victim.deaths += 1
        victim.currentStreak = 0
    }

    private handlePlayerKill(killer: ParsedPlayer, victim: ParsedPlayer, weapon: string, timestamp: Date): void {
        const isFriendlyFire = killer.team && victim.team && killer.team === victim.team

        if (isFriendlyFire) {
            killer.frags -= 1
        } else {
            killer.frags += 1
            killer.currentStreak += 1
            if (killer.currentStreak > killer.longestStreak) {
                killer.longestStreak = killer.currentStreak
            }
            killer.weapons[weapon] = (killer.weapons[weapon] || 0) + 1
            killer.killTimestamps.push(timestamp)
        }

        victim.deaths += 1
        victim.currentStreak = 0
    }

    private ensurePlayerExists(match: ParsedMatch, playerName: string): void {
        if (match.players[playerName]) return

        const currentPlayersCount = Object.keys(match.players).filter(p => p !== PlayerName.World).length

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
            killTimestamps: []
        }
    }
}