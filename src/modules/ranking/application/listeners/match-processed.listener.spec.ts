import { Test, TestingModule } from '@nestjs/testing'
import { MatchProcessedListener } from './match-processed.listener'
import { GlobalRankingService } from '../services/global-ranking.service'
import { PlayerName } from 'src/shared/enum/player.enum'
import { ParsedMatch } from 'src/shared/interfaces/match.interfaces'

describe('MatchProcessedListener', () => {
    let listener: MatchProcessedListener
    let rankingService: jest.Mocked<GlobalRankingService>

    beforeEach(async () => {
        const mockRankingService = {
            incrementFrags: jest.fn(),
            getGlobalRanking: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchProcessedListener,
                { provide: GlobalRankingService, useValue: mockRankingService },
            ],
        }).compile()

        listener = module.get<MatchProcessedListener>(MatchProcessedListener)
        rankingService = module.get(GlobalRankingService) as jest.Mocked<GlobalRankingService>
    })

    it('deve processar a partida e mandar incrementar frags de todos os jogadores', async () => {
        const mockMatch: Partial<ParsedMatch> = {
            matchId: '123',
            players: {
                [PlayerName.Roman]: { name: PlayerName.Roman, frags: 3 } as any,
                [PlayerName.Nick]: { name: PlayerName.Nick, frags: 1 } as any,
            },
        }

        await listener.handleMatchProcessed(mockMatch as ParsedMatch)

        expect(rankingService.incrementFrags).toHaveBeenCalledTimes(2)
        expect(rankingService.incrementFrags).toHaveBeenCalledWith(PlayerName.Roman, 3)
        expect(rankingService.incrementFrags).toHaveBeenCalledWith(PlayerName.Nick, 1)
    })
})