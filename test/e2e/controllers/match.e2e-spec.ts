import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { PlayerName } from 'src/shared/enum/player.enum'
import { ApiRoutes } from 'src/shared/enum/api-routes.enum'

import { MatchController } from 'src/modules/match/infra/controllers/match.controller'
import { AnalyticsController } from 'src/modules/match/infra/controllers/analytics.controller'
import { RankingController } from 'src/modules/ranking/infra/controllers/ranking.controller'

import { ProcessLogUseCase } from 'src/modules/match/application/use-cases/process-log.use-case'
import { GetMatchDetailsUseCase } from 'src/modules/match/application/use-cases/get-match-details.use-case'
import { GetMatchRankingUseCase } from 'src/modules/match/application/use-cases/get-match-ranking.use-case'
import { GetPlayerComparisonUseCase } from 'src/modules/match/application/use-cases/get-player-comparison.use-case'

import { LogParserService } from 'src/modules/match/application/services/log-parser.service'
import { BadgeEngine } from 'src/modules/match/application/services/engines/badge.engine'
import { TimelineEngine } from 'src/modules/match/application/services/engines/timeline.engine'
import { MatchStateManager } from 'src/modules/match/application/services/engines/match-state.manager'

import { MatchRepository } from 'src/modules/match/domain/repositories/match.repository'
import { GlobalRankingService } from 'src/modules/ranking/application/services/global-ranking.service'
import { REDIS_CLIENT } from 'src/infra/cache/redis-cache.module'
import { PlayerComparisonService } from 'src/modules/match/application/services/player-comparison.service'
import { MatchProcessedListener } from 'src/modules/ranking/application/listeners/match-processed.listener'

describe('MatchController (e2e)', () => {
    let app: INestApplication

    // Simple in-memory match repository compatible with production use-cases
    class InMemoryMatchRepository implements MatchRepository {
        private store = new Map<string, any>()

        async save(match: any): Promise<void> {
            const copy = { ...match }
            if (copy.players && !(copy.players instanceof Map)) {
                copy.players = new Map(Object.entries(copy.players))
            }
            this.store.set(match.matchId, copy)
        }

        async findById(matchId: string) {
            return this.store.get(matchId) ?? null
        }

        async findAll() {
            return Array.from(this.store.values())
        }

        async findPlayersInteractions(p1: string, p2: string) {
            return Array.from(this.store.values()).filter((m: any) => {
                const players = m.players
                if (!players) return false
                if (players instanceof Map) return players.has(p1) && players.has(p2)
                return Boolean(players[p1] && players[p2])
            })
        }
    }

    // Lightweight fake Redis used by GlobalRankingService
    class FakeRedis {
        private map = new Map<string, Map<string, number>>()

        async zincrby(key: string, inc: number, member: string) {
            if (!this.map.has(key)) this.map.set(key, new Map())
            const bucket = this.map.get(key)!
            bucket.set(member, (bucket.get(member) || 0) + Number(inc))
            return String(bucket.get(member))
        }

        async zrevrange(key: string, start: number, stop: number, withScores?: string) {
            const bucket = this.map.get(key) || new Map()
            const entries = Array.from(bucket.entries()).sort((a, b) => b[1] - a[1])
            const result: string[] = []
            for (const [member, score] of entries) {
                result.push(member)
                if (withScores) result.push(String(score))
            }
            return result
        }
    }

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [EventEmitterModule.forRoot()],
            controllers: [MatchController, AnalyticsController, RankingController],
            providers: [
                ProcessLogUseCase,
                GetMatchDetailsUseCase,
                GetMatchRankingUseCase,
                GetPlayerComparisonUseCase,
                LogParserService,
                BadgeEngine,
                TimelineEngine,
                MatchStateManager,
                PlayerComparisonService,
                GlobalRankingService,
                MatchProcessedListener,
                { provide: MatchRepository, useClass: InMemoryMatchRepository },
                { provide: PlayerComparisonService, useValue: { compareHeadToHead: jest.fn() } },
                { provide: REDIS_CLIENT, useValue: new FakeRedis() },
            ],
        }).compile()

        app = moduleFixture.createNestApplication()
        app.useGlobalPipes(new ValidationPipe())
        await app.init()
    })

    afterAll(async () => {
        await app.close()
    })

    it('/matches/upload (POST) - Should process log and return 201', () => {
        const logContent = `23/04/2019 15:34:22 - New match 1 has started
23/04/2019 15:36:04 - ${PlayerName.Roman} killed ${PlayerName.Nick} using M16
23/04/2019 15:39:22 - Match 1 has ended`

        return request(app.getHttpServer())
            .post('/matches/matches/upload')
            .attach('file', Buffer.from(logContent), 'log.txt')
            .expect(201)
            .expect((res) => {
                expect(res.body.message).toBeDefined()
            })
    })

    it('/matches/:id (GET) - Should return processed match details', async () => {
        const response = await request(app.getHttpServer()).get(ApiRoutes.MatchesById('1')).expect(200)

        expect(response.body.matchId).toBe('1')
        expect(response.body.players).toBeDefined()
        const roman = response.body.players[PlayerName.Roman]
        expect(roman).toBeDefined()
        expect(roman.frags).toBe(1)
    })

    it('/matches/upload (POST) - Should fail if no file provided (422)', () => {
        return request(app.getHttpServer()).post('/matches/matches/upload').expect(422)
    })

    it('/matches/:id (GET) - Should return 404 for non-existent match', () => {
        return request(app.getHttpServer()).get('/matches/999999').expect(404)
    })

    it('/matches/upload (POST) - Should process complex logs with World kills', async () => {
        const complexLog = `23/04/2019 15:34:22 - New match 2 has started
23/04/2019 15:36:04 - ${PlayerName.World} killed ${PlayerName.Roman} by MOD_FALLING
23/04/2019 15:36:05 - ${PlayerName.Nick} killed ${PlayerName.Roman} using M16
23/04/2019 15:39:22 - Match 2 has ended`

        await request(app.getHttpServer())
            .post('/matches/matches/upload')
            .attach('file', Buffer.from(complexLog), 'complex.txt')
            .expect(201)

        const res = await request(app.getHttpServer()).get(ApiRoutes.MatchesById('2'))
        const roman = res.body.players[PlayerName.Roman]
        expect(roman).toBeDefined()
        expect(roman.frags).toBeLessThanOrEqual(0)
    })
})
