import { Weapon } from "../enum/weapon.enum"

export interface ParsedPlayer {
    name: string
    frags: number
    deaths: number
    weapons: Record<string, number>
    currentStreak: number
    longestStreak: number
    killTimestamps: Date[]
}

export interface ParsedMatch {
    matchId: string
    players: Record<string, ParsedPlayer>
    winningWeapon?: Weapon | null
}
