import { Test, TestingModule } from '@nestjs/testing'
import { PlayerComparisonService } from '../../player-comparison.service'
import { MatchRepository } from '../../../../domain/repositories/match.repository'

describe('PlayerComparisonService', () => {
    let service: PlayerComparisonService
    let matchRepository: jest.Mocked<MatchRepository>

    beforeEach(async () => {
        const mockRepository = { findAll: jest.fn(), save: jest.fn(), findById: jest.fn() }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlayerComparisonService,
                { provide: MatchRepository, useValue: mockRepository },
            ],
        }).compile()

        service = module.get<PlayerComparisonService>(PlayerComparisonService)
        matchRepository = module.get(MatchRepository) as jest.Mocked<MatchRepository>
    })

    it('should return zero values when no shared matches', async () => {
        matchRepository.findAll.mockResolvedValue([])
        const res = await service.compareHeadToHead('A', 'B')
        expect(res.prediction).toBe('tie')
        expect(res.matches_played_together).toBe(0)
    })

    it('should calculate statistics, advantages and prediction correctly', async () => {
        matchRepository.findAll.mockResolvedValue([
            {
                players: {
                    A: { frags: 10, deaths: 2, longestStreak: 5, weapons: { M16: 10 } },
                    B: { frags: 2, deaths: 10, longestStreak: 1, weapons: { AK47: 2 } }
                }
            } as any
        ])

        const res = await service.compareHeadToHead('A', 'B')

        expect(res.matches_played_together).toBe(1)
        expect(res.player1.frags).toBe(10)
        expect(res.player1.win_rate).toBe(1)
        expect(res.prediction).toBe('player1')
        expect(res.confidence).toBeGreaterThan(0)
    })

    it('prediction favorece player2 se os status dele forem maiores', async () => {
        matchRepository.findAll.mockResolvedValue([
            {
                players: {
                    A: { frags: 1, deaths: 10, longestStreak: 1, weapons: { M16: 1 } },
                    B: { frags: 15, deaths: 1, longestStreak: 8, weapons: { AK47: 15 } }
                }
            } as any
        ])

        const res = await service.compareHeadToHead('A', 'B')
        expect(res.prediction).toBe('player2')
    })

    it('should return empty advantages and tie prediction if stats do not exist', async () => {
        const resAdvantages = (service as any).calculateAdvantages(undefined, undefined)
        expect(resAdvantages).toEqual([])

        const resPrediction = (service as any).makePrediction(undefined, undefined)
        expect(resPrediction).toEqual({ prediction: 'tie', confidence: 0 })
    })

    it('should return null if player has no weapons', async () => {
        const res = (service as any).getMostUsedWeapon({})
        expect(res).toBeNull()
    })

    it('should handle technical tie in prediction (tie)', async () => {
        // Players with identical stats
        matchRepository.findAll.mockResolvedValue([
            {
                players: {
                    A: { frags: 5, deaths: 5, longestStreak: 2, weapons: { M16: 5 } },
                    B: { frags: 5, deaths: 5, longestStreak: 2, weapons: { M16: 5 } }
                }
            } as any
        ])

        const res = await service.compareHeadToHead('A', 'B')
        expect(res.prediction).toBe('tie')
        expect(res.player1.win_rate).toBe(0) // Tied frags doesn't count as win in your loop
    })

    it('should calculate experience and weapon diversity advantages', async () => {
        matchRepository.findAll.mockResolvedValue([
            {
                players: {
                    // A has more weapons, B has more frags
                    A: { frags: 1, deaths: 0, longestStreak: 1, weapons: { M16: 1, AK: 1, PISTOL: 1 } },
                    B: { frags: 10, deaths: 1, longestStreak: 5, weapons: { M16: 10 } }
                }
            } as any
        ])

        const res = await service.compareHeadToHead('A', 'B')
        expect(res.advantages.player1).toContain('Weapon diversity')
        expect(res.advantages.player2).toContain('K/D ratio')
    })

    it('should predict victory for player 2 if they have more historical wins despite equal K/D', async () => {
        matchRepository.findAll.mockResolvedValue([
            {
                players: {
                    A: { frags: 10, deaths: 10, longestStreak: 2, weapons: { AK: 10 } },
                    B: { frags: 10, deaths: 10, longestStreak: 2, weapons: { AK: 10 } }
                }
            } as any,
            {
                players: {
                    A: { frags: 1, deaths: 5, longestStreak: 0, weapons: { AK: 1 } },
                    B: { frags: 10, deaths: 0, longestStreak: 10, weapons: { AK: 10 } }
                }
            } as any
        ])
        const res = await service.compareHeadToHead('A', 'B')
        expect(res.prediction).toBe('player2')
    })
})