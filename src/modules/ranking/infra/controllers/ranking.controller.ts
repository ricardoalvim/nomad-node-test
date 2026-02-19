import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { GlobalRankingService } from '../../application/services/global-ranking.service'
import { GlobalPlayerRanking } from 'src/shared/interfaces/match.interfaces'
import { ApiRoutes } from 'src/shared/api-routes'

@ApiTags('Ranking')
@Controller()
export class RankingController {
    constructor(private readonly rankingService: GlobalRankingService) { }

    @Get(ApiRoutes.RankingGlobal)
    @ApiOperation({ summary: 'Retorna o ranking global de jogadores ordenado por frags' })
    async getGlobalRanking(): Promise<GlobalPlayerRanking[]> {
        return this.rankingService.getGlobalRanking()
    }
}