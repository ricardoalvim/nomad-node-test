import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { GetMatchRankingUseCase } from '../../get-match-ranking.use-case'
import { MatchRepository } from '../../../../domain/repositories/match.repository'
import { Weapon } from 'src/shared/enum/weapon.enum'
import { Award } from 'src/shared/enum/award.enum'

describe('GetMatchRankingUseCase', () => {
  let useCase: GetMatchRankingUseCase
  let repository: jest.Mocked<MatchRepository>

  beforeEach(async () => {
    const mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetMatchRankingUseCase, { provide: MatchRepository, useValue: mockRepository }],
    }).compile()

    useCase = module.get<GetMatchRankingUseCase>(GetMatchRankingUseCase)
    repository = module.get(MatchRepository) as jest.Mocked<MatchRepository>
  })

  it('should return ranking formatted and sorted by frags', async () => {
    repository.findById.mockResolvedValue({
      matchId: '123',
      winningWeapon: Weapon.AK47,
      players: new Map([
        ['Noob', { name: 'Noob', frags: 1, deaths: 10, longestStreak: 1, awards: [] }],
        ['Pro', { name: 'Pro', frags: 20, deaths: 0, longestStreak: 15, awards: [Award.Immortal] }],
        ['Mid', { name: 'Mid', frags: 10, deaths: 5, longestStreak: 3, awards: [] }],
      ]),
    } as any)

    const result = await useCase.execute('123')

    expect(repository.findById).toHaveBeenCalledWith('123')
    expect(result.matchId).toBe('123')
    expect(result.winnerWeapon).toBe(Weapon.AK47)

    // Pro must be first (index 0) and Noob last (index 2)
    expect(result.ranking).toHaveLength(3)
    expect(result.ranking[0].name).toBe('Pro')
    expect(result.ranking[1].name).toBe('Mid')
    expect(result.ranking[2].name).toBe('Noob')
  })

  it('should throw NotFoundException if match does not exist', async () => {
    // Database returns null
    repository.findById.mockResolvedValue(null)

    await expect(useCase.execute('999')).rejects.toThrow(NotFoundException)
  })
})
