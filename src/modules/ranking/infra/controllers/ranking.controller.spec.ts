import { Test, TestingModule } from '@nestjs/testing'
import { RankingController } from './ranking.controller'
import { GlobalRankingService } from '../../application/services/global-ranking.service'
import { PlayerName } from 'src/shared/enum/player.enum'

describe('RankingController', () => {
    let controller: RankingController
    let rankingService: jest.Mocked<GlobalRankingService>

    beforeEach(async () => {
        const mockRankingService = {
            incrementFrags: jest.fn(),
            getGlobalRanking: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            controllers: [RankingController],
            providers: [
                { provide: GlobalRankingService, useValue: mockRankingService },
            ],
        }).compile()

        controller = module.get<RankingController>(RankingController)
        rankingService = module.get(GlobalRankingService) as jest.Mocked<GlobalRankingService>
    })

    it('deve retornar o ranking global do serviço', async () => {
        const mockRanking = [{ name: PlayerName.Roman, totalFrags: 15 }]
        rankingService.getGlobalRanking.mockResolvedValue(mockRanking)

        const result = await controller.getGlobalRanking()

        expect(rankingService.getGlobalRanking).toHaveBeenCalledTimes(1)
        expect(result).toEqual(mockRanking)
    })
})