import { Award } from 'src/shared/enum/award.enum'
import { Badge } from 'src/shared/enum/badge.enum'
import { BadgeEngine } from '../badge.engine'

describe('BadgeEngine', () => {
  let engine: BadgeEngine

  beforeEach(() => {
    engine = new BadgeEngine()
  })

  it('should return Immortal award when player has frags and zero deaths', () => {
    const result = engine.calculate(
      { players: {} } as any,
      { frags: 5, deaths: 0, killTimestamps: [], weapons: {} } as any,
    )
    expect(result.awards).toContain(Award.Immortal)
  })

  it('should return Rambo award when player gets 5+ kills in 60 seconds', () => {
    const now = Date.now()
    const timestamps = [
      new Date(now),
      new Date(now + 10000),
      new Date(now + 20000),
      new Date(now + 30000),
      new Date(now + 40000),
    ]

    const result = engine.calculate(
      { players: {} } as any,
      { frags: 5, deaths: 0, killTimestamps: timestamps, weapons: {} } as any,
    )
    expect(result.awards).toContain(Award.Rambo)
  })

  it('should return Blitz badge when player gets 7+ kills in 30 seconds', () => {
    const now = Date.now()
    const timestamps = [
      new Date(now),
      new Date(now + 5000),
      new Date(now + 10000),
      new Date(now + 15000),
      new Date(now + 20000),
      new Date(now + 25000),
      new Date(now + 28000),
    ]

    const result = engine.calculate(
      { players: { player1: { frags: 0, deaths: 0 } } } as any,
      { name: 'player1', frags: 7, deaths: 0, longestStreak: 7, killTimestamps: timestamps, weapons: { M16: 7 } } as any,
    )
    expect(result.badges).toContain(Badge.Blitz)
  })

  it('should return Unstoppable badge when player has 10+ kill streak', () => {
    const result = engine.calculate(
      { players: {} } as any,
      { frags: 10, deaths: 0, longestStreak: 10, killTimestamps: [], weapons: { M16: 10 } } as any,
    )
    expect(result.badges).toContain(Badge.Unstoppable)
  })

  it('should return Flawless badge when player has 10+ frags and zero deaths', () => {
    const result = engine.calculate(
      { players: {} } as any,
      { frags: 10, deaths: 0, longestStreak: 5, killTimestamps: [], weapons: { M16: 10 } } as any,
    )
    expect(result.badges).toContain(Badge.Flawless)
  })

  it('should return Perfect badge when player wins with zero deaths', () => {
    const result = engine.calculate(
      {
        players: {
          player1: { name: 'player1', frags: 5, deaths: 0 },
          player2: { name: 'player2', frags: 3, deaths: 2 },
        },
      } as any,
      { name: 'player1', frags: 5, deaths: 0, longestStreak: 5, killTimestamps: [], weapons: { M16: 5 } } as any,
    )
    expect(result.badges).toContain(Badge.Perfect)
  })

  it('should return RifleKing badge when 80%+ kills with single weapon', () => {
    const result = engine.calculate(
      { players: {} } as any,
      { frags: 10, deaths: 0, longestStreak: 0, killTimestamps: [], weapons: { M16: 8, AK47: 2 } } as any,
    )
    expect(result.badges).toContain(Badge.RifleKing)
  })

  it('should return Arsenal badge when 3+ weapons used', () => {
    const result = engine.calculate(
      { players: {} } as any,
      { frags: 9, deaths: 0, longestStreak: 0, killTimestamps: [], weapons: { M16: 3, AK47: 3, SHOTGUN: 3 } } as any,
    )
    expect(result.badges).toContain(Badge.Arsenal)
  })

  it('should NOT return awards when player has deaths', () => {
    const result = engine.calculate(
      { players: {} } as any,
      { frags: 5, deaths: 1, killTimestamps: [], weapons: { M16: 5 } } as any,
    )
    expect(result.awards).not.toContain(Award.Immortal)
  })
})
