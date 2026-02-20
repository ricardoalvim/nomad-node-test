import { Injectable } from '@nestjs/common'
import { ParsedMatch, ParsedPlayer } from 'src/shared/interfaces/match.interfaces'
import { Award } from 'src/shared/enum/award.enum'
import { Badge } from 'src/shared/enum/badge.enum'

@Injectable()
export class BadgeEngine {
    calculate(match: ParsedMatch, player: ParsedPlayer): { awards: Award[], badges: Badge[] } {
        return {
            awards: this.getAwards(player),
            badges: this.getBadges(match, player)
        }
    }

    private getAwards(player: ParsedPlayer): Award[] {
        const awards: Award[] = []
        if (player.deaths === 0 && player.frags > 0) awards.push(Award.Immortal)
        if (this.hasFastKills(player.killTimestamps, 5, 60000)) awards.push(Award.Rambo)
        return awards
    }

    private getBadges(match: ParsedMatch, player: ParsedPlayer): Badge[] {
        const badges: Badge[] = []

        if (player.longestStreak >= 10) badges.push(Badge.Unstoppable)
        if (player.deaths === 0 && player.frags >= 10) badges.push(Badge.Flawless)
        if (this.isPerfectWinner(match, player)) badges.push(Badge.Perfect)
        if (this.hasWeaponMastery(player, 0.8)) badges.push(Badge.RifleKing)
        if (Object.keys(player.weapons).length >= 3) badges.push(Badge.Arsenal)
        if (this.hasFastKills(player.killTimestamps, 7, 30000)) badges.push(Badge.Blitz)

        return badges
    }

    private hasFastKills(timestamps: Date[], count: number, windowMs: number): boolean {
        if (timestamps.length < count) return false
        const sorted = [...timestamps].sort((a, b) => a.getTime() - b.getTime())
        for (let i = count - 1; i < sorted.length; i++) {
            if (sorted[i].getTime() - sorted[i - (count - 1)].getTime() <= windowMs) return true
        }
        return false
    }

    private isPerfectWinner(match: ParsedMatch, player: ParsedPlayer): boolean {
        if (player.deaths !== 0 || player.frags === 0) return false
        return !Object.values(match.players).some(p => p.name !== player.name && p.frags > player.frags)
    }

    private hasWeaponMastery(player: ParsedPlayer, threshold: number): boolean {
        const totalKills = Object.values(player.weapons).reduce((a, b) => a + b, 0)
        if (totalKills === 0) return false
        return Object.values(player.weapons).some(kills => kills / totalKills >= threshold)
    }
}