import { Test, TestingModule } from '@nestjs/testing'
import { GetPlayerComparisonUseCase } from '../../get-player-comparison.use-case'
import { PlayerComparisonService } from '../../../services/player-comparison.service'
import { MatchRepository } from '../../../../domain/repositories/match.repository'
import { BadRequestException } from '@nestjs/common'

describe('GetPlayerComparisonUseCase', () => {
    let useCase: GetPlayerComparisonUseCase
    let comparisonService: jest.Mocked<PlayerComparisonService>
    let matchRepository: jest.Mocked<MatchRepository>

    beforeEach(async () => {
        const mockComparisonService = {
            compareHeadToHead: jest.fn(),
        }

        const mockMatchRepository = {
            findPlayersInteractions: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GetPlayerComparisonUseCase,
                {
                    provide: PlayerComparisonService,
                    useValue: mockComparisonService,
                },
                {
                    provide: MatchRepository,
                    useValue: mockMatchRepository,
                },
            ],
        }).compile()

        useCase = module.get<GetPlayerComparisonUseCase>(GetPlayerComparisonUseCase)
        comparisonService = module.get(PlayerComparisonService) as jest.Mocked<PlayerComparisonService>
        matchRepository = module.get(MatchRepository) as jest.Mocked<MatchRepository>
    })

    it('should throw BadRequest when parameters are missing', async () => {
        await expect(useCase.execute('', 'B')).rejects.toThrow(BadRequestException)
        await expect(useCase.execute('A', '')).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequest when names are equal', async () => {
        await expect(useCase.execute('A', 'A')).rejects.toThrow(BadRequestException)
    })

    it('should delegate to comparison service when valid', async () => {
        const expected = { player1: { name: 'A' }, player2: { name: 'B' } }
        const mockMatches = []

        matchRepository.findPlayersInteractions.mockResolvedValue(mockMatches as any)
        comparisonService.compareHeadToHead.mockResolvedValue(expected as any)

        const res = await useCase.execute('A', 'B')

        expect(matchRepository.findPlayersInteractions).toHaveBeenCalledWith('A', 'B')
        expect(comparisonService.compareHeadToHead).toHaveBeenCalledWith('A', 'B', mockMatches)
        expect(res).toBe(expected)
    })
})
