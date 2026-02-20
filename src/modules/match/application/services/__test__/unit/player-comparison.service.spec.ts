import { Test, TestingModule } from '@nestjs/testing'
import { PlayerComparisonService } from '../../player-comparison.service'

describe('PlayerComparisonService', () => {
    let service: PlayerComparisonService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PlayerComparisonService],
        }).compile()

        service = module.get<PlayerComparisonService>(PlayerComparisonService)
    })

    it('should return zero values when no shared matches', async () => {
        const res = await service.compareHeadToHead('A', 'B', [])
        expect(res.prediction).toBe('tie')
        expect(res.matches_played_together).toBe(0)
    })

    it('should calculate statistics, advantages and prediction correctly', async () => {
        const mockedMatches = [{
            players: {
                A: { frags: 10, deaths: 2, longestStreak: 5, weapons: { M16: 10 } },
                B: { frags: 2, deaths: 10, longestStreak: 1, weapons: { AK47: 2 } },
            },
        } as any]

        const res = await service.compareHeadToHead('A', 'B', mockedMatches)

        expect(res.matches_played_together).toBe(1)
        expect(res.player1.frags).toBe(10)
        expect(res.player1.win_rate).toBe(1)
        expect(res.prediction).toBe('player1')
        expect(res.confidence).toBeGreaterThan(0)
    })

    it('prediction favorece player2 se os status dele forem maiores', async () => {
        const mockedMatches = [{
            players: {
                A: { frags: 1, deaths: 10, longestStreak: 1, weapons: { M16: 1 } },
                B: { frags: 15, deaths: 1, longestStreak: 8, weapons: { AK47: 15 } },
            },
        } as any]

        const res = await service.compareHeadToHead('A', 'B', mockedMatches)
        expect(res.prediction).toBe('player2')
    })

    it('should return empty advantages and tie prediction if stats do not exist', async () => {
        const resAdvantages = (service as any).calculateAdvantages({ frags: 0, deaths: 0, wins: 0 }, { frags: 0, deaths: 0, wins: 0 })
        expect(resAdvantages).toEqual(['Experience'])
    })

    it('should return null if player has no weapons', () => {
        const res = (service as any).getMostUsedWeapon({})
        expect(res).toBeNull()
    })

    it('should handle technical tie in prediction (tie)', async () => {
        const mockedMatches = [{
            players: {
                A: { frags: 5, deaths: 5, longestStreak: 2, weapons: { M16: 5 } },
                B: { frags: 5, deaths: 5, longestStreak: 2, weapons: { M16: 5 } },
            },
        } as any]

        const res = await service.compareHeadToHead('A', 'B', mockedMatches)
        expect(res.prediction).toBe('tie')
        expect(res.player1.win_rate).toBe(0)
    })
})