import { Weapon } from '../enum/weapon.enum'
import { Award } from '../enum/award.enum'
import { Badge } from '../enum/badge.enum'
import { TeamName } from '../enum/team-name.enum'

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
  badges?: Badge[]
}

/** Timeline event significance level */
export type TimelineEventSeverity = 'low' | 'medium' | 'high'

/** Types of significant match events */
export enum TimelineEventType {
  KillStreak = 'kill_streak', // 3+ consecutive kills
  KillStreakBroken = 'streak_broken', // Someone broke a streak
  TeamKill = 'team_kill', // Friendly fire incident
  WeaponSwitch = 'weapon_switch', // Significant weapon change
  IntenseAction = 'intense_action', // Multiple kills in short time
  FirstBlood = 'first_blood', // First kill of match
  DominationStart = 'domination_start', // Player started dominating
}

/** Timeline event describing critical moments in a match */
export interface TimelineEvent {
  timestamp: Date
  type: TimelineEventType
  description: string
  players: string[]
  severity: TimelineEventSeverity
}

export interface ParsedMatch {
  matchId: string
  players: Record<string, ParsedPlayer>
  winningWeapon?: Weapon | null
  timeline?: TimelineEvent[]
}
