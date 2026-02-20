import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'
import { REDIS_CLIENT } from 'src/infra/cache/redis-cache.module'
import { PlayerName } from 'src/shared/enum/player.enum'
import { GlobalPlayerRanking } from 'src/shared/interfaces/ranking.interface'

@Injectable()
export class GlobalRankingService {
  private readonly RANKING_KEY = 'global_ranking_frags'

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async incrementFrags(playerName: string, fragsToAdd: number): Promise<void> {
    if (fragsToAdd <= 0 || playerName === PlayerName.World) return

    await this.redis.zincrby(this.RANKING_KEY, fragsToAdd, playerName)
  }

  async getGlobalRanking(): Promise<GlobalPlayerRanking[]> {
    const result = await this.redis.zrevrange(this.RANKING_KEY, 0, -1, 'WITHSCORES')

    const ranking: GlobalPlayerRanking[] = []

    for (let i = 0; i < result.length; i += 2) {
      ranking.push({
        name: result[i],
        totalFrags: parseInt(result[i + 1], 10),
      })
    }

    return ranking
  }
}
