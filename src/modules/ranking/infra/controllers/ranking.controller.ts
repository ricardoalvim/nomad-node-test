import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { GlobalRankingService } from '../../application/services/global-ranking.service'
import { ApiRoutes } from 'src/shared/enum/api-routes.enum'
import { GlobalPlayerRanking } from 'src/shared/interfaces/ranking.interface'

@ApiTags('Ranking')
@Controller()
export class RankingController {
    constructor(private readonly rankingService: GlobalRankingService) { }

    @Get(ApiRoutes.RankingGlobal)
    @ApiOperation({ summary: 'Get global player ranking sorted by frags' })
    async getGlobalRanking(): Promise<GlobalPlayerRanking[]> {
        return this.rankingService.getGlobalRanking()
    }
}