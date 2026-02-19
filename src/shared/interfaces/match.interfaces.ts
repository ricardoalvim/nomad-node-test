import { Weapon } from "../enum/weapon.enum"
import { Award } from "../enum/award.enum"
import { TeamName } from "../enum/team-name.enum"

export interface ParsedPlayer {
    name: string
    frags: number
    deaths: number
    weapons: Record<string, number>
    currentStreak: number
    longestStreak: number
    killTimestamps: Date[]
    team?: TeamName
    awards?: Award[]
}

export interface ParsedMatch {
    matchId: string
    players: Record<string, ParsedPlayer>
    winningWeapon?: Weapon | null
}
