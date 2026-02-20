/**
 * Head-to-Head Comparison between two players
 * Analyzes all matches where both players participated
 */
export interface PlayerHeadToHeadStats {
  name: string
  frags: number
  deaths: number
  kills_against_opponent: number
  deaths_against_opponent: number
  win_rate: number
  favorite_weapon: string | null
  avg_kill_streak: number
  total_matches: number
}

export interface PlayerHeadToHeadComparison {
  player1: PlayerHeadToHeadStats
  player2: PlayerHeadToHeadStats
  matches_played_together: number
  total_head_to_head_kills: number
  advantages: {
    player1: string[] // e.g., ["K/D ratio", "Weapon diversity"]
    player2: string[]
  }
  prediction: 'player1' | 'player2' | 'tie'
  confidence: number // 0-100, how confident is the prediction
}

/**
 * Player efficiency score - advanced K/D metric
 */
export interface EfficiencyMetrics {
  player_name: string
  raw_kd: number
  adjusted_kd: number
  efficiency_score: number // 0-100
  kill_quality: number // based on weapon used
  survival_rating: number // time alive vs dying
  consistency_index: number // variance of performance
  team_kill_penalty: number // impact of FF kills
  avg_opponent_level: number
  verdict: 'elite' | 'skilled' | 'average' | 'needs_practice'
}

/**
 * Weapon meta statistics per weapon type
 */
export interface WeaponMetaStats {
  weapon: string
  times_used: number
  usage_rate: number // percentage of players using
  total_kills: number
  kills_per_use: number
  win_rate_with_weapon: number
  average_kd_with_weapon: number
  tier: 'S' | 'A' | 'B' | 'C' // meta tier ranking
}

export interface WeaponMetaReport {
  analysis_date: Date
  total_matches_analyzed: number
  weapons: WeaponMetaStats[]
  dominant_weapon: string
  balanced_meta: boolean
}
