import { Controller, Get, Query, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { GetPlayerComparisonUseCase } from '../../application/use-cases/get-player-comparison.use-case'
import { PlayerHeadToHeadComparison } from 'src/shared/interfaces/analytics.interface'

/**
 * Analytics Controller
 * Provides advanced analytics and comparisons
 */
@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly getPlayerComparisonUseCase: GetPlayerComparisonUseCase) { }

    /**
     * Compare two players based on head-to-head record
     * @param player1 First player name
     * @param player2 Second player name
     * @returns Head-to-head comparison with statistics and prediction
     */
    @Get('comparison')
    @ApiOperation({ summary: 'Head-to-head comparison between two players' })
    @ApiQuery({ name: 'player1', type: String, description: 'First player name' })
    @ApiQuery({ name: 'player2', type: String, description: 'Second player name' })
    async compareHeadToHead(
        @Query('player1') player1: string,
        @Query('player2') player2: string,
    ): Promise<PlayerHeadToHeadComparison> {
        if (!player1 || !player2) {
            throw new BadRequestException('Both player1 and player2 query parameters are required')
        }

        return this.getPlayerComparisonUseCase.execute(player1, player2)
    }
}
