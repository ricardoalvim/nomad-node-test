import { Test, TestingModule } from '@nestjs/testing'
import { GlobalRankingService } from './global-ranking.service'
import { REDIS_CLIENT } from 'src/infra/cache/redis-cache.module'
import { PlayerName } from 'src/shared/enum/player.enum'

describe('GlobalRankingService', () => {
    let service: GlobalRankingService
    let redisClient: any

    beforeEach(async () => {
        const mockRedis = {
            zincrby: jest.fn(),
            zrevrange: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GlobalRankingService,
                { provide: REDIS_CLIENT, useValue: mockRedis },
            ],
        }).compile()

        service = module.get<GlobalRankingService>(GlobalRankingService)
        redisClient = module.get(REDIS_CLIENT)
    })

    it('deve incrementar os frags no Redis corretamente', async () => {
        await service.incrementFrags(PlayerName.Roman, 2)
        expect(redisClient.zincrby).toHaveBeenCalledWith('global_ranking_frags', 2, PlayerName.Roman)
    })

    it('não deve incrementar frags para o <WORLD> ou se o número de frags for 0', async () => {
        await service.incrementFrags(PlayerName.World, 5)
        await service.incrementFrags(PlayerName.Nick, 0)
        await service.incrementFrags(PlayerName.Nick, -1)

        expect(redisClient.zincrby).not.toHaveBeenCalled()
    })

    it('deve retornar o ranking formatado a partir do flat array do Redis', async () => {
        redisClient.zrevrange.mockResolvedValue([PlayerName.Roman, '10', PlayerName.Nick, '5'])

        const result = await service.getGlobalRanking()

        expect(redisClient.zrevrange).toHaveBeenCalledWith('global_ranking_frags', 0, -1, 'WITHSCORES')
        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({ name: PlayerName.Roman, totalFrags: 10 })
        expect(result[1]).toEqual({ name: PlayerName.Nick, totalFrags: 5 })
    })
})