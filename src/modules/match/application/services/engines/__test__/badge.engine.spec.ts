import { Award } from 'src/shared/enum/award.enum'
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
})
