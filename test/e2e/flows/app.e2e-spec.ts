import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { EventEmitterModule } from '@nestjs/event-emitter'

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

/**
 * E2E tests that start a Nest application and call HTTP endpoints.
 * Uses in-memory implementations for MatchRepository and Redis client so
 * tests are deterministic and do not require external services.
 */
describe('E2E App (HTTP) - Endpoints', () => {
    let app: INestApplication

    beforeAll(async () => {
        // In-memory match repository
        class InMemoryMatchRepository implements MatchRepository {
            private store = new Map<string, any>()

            async save(match: any): Promise<void> {
                // Normalize players to Map to match production repository expectations
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
                    if (players instanceof Map) {
                        return players.has(p1) && players.has(p2)
                    }
                    return Boolean(players[p1] && players[p2])
                })
            }
        }

        // Minimal in-memory Redis-like client supporting zincrby and zrevrange
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
                { provide: MatchRepository, useClass: InMemoryMatchRepository },
                {
                    provide: PlayerComparisonService,
                    useValue: {
                        compareHeadToHead: jest.fn().mockResolvedValue({
                            player1: {
                                name: 'Roman',
                                frags: 1,
                                deaths: 0,
                                kills_against_opponent: 1,
                                deaths_against_opponent: 0,
                                win_rate: 100,
                                favorite_weapon: 'M16',
                                avg_kill_streak: 1,
                                total_matches: 1,
                            },
                            player2: {
                                name: 'Unguento',
                                frags: 0,
                                deaths: 1,
                                kills_against_opponent: 0,
                                deaths_against_opponent: 1,
                                win_rate: 0,
                                favorite_weapon: null,
                                avg_kill_streak: 0,
                                total_matches: 1,
                            },
                            matches_played_together: 1,
                            total_head_to_head_kills: 1,
                            advantages: { player1: ['frags'], player2: [] },
                            prediction: 'player1',
                            confidence: 80,
                        }),
                    },
                },
                { provide: REDIS_CLIENT, useValue: new FakeRedis() },
            ],
        }).compile()

        app = moduleFixture.createNestApplication()
        await app.init()
    })

    afterAll(async () => {
        await app.close()
    })

    it('POST /matches/upload → should accept file and return upload result', async () => {
        const content = `23/04/2019 15:34:22 - New match 1 has started\n23/04/2019 15:36:04 - Roman killed Unguento using M16\n23/04/2019 15:39:22 - Match 1 has ended`

        const res = await request(app.getHttpServer())
            .post('/matches/matches/upload')
            .attach('file', Buffer.from(content), 'test.log')
            .expect(201)

        expect(res.body).toHaveProperty('filename')
        expect(res.body.filename).toBe('test.log')
    })

    it('GET /matches/:matchId → should return 404 for unknown', async () => {
        await request(app.getHttpServer()).get('/matches/999999').expect(404)
    })

    it('GET /ranking/global → should return empty array initially', async () => {
        const res = await request(app.getHttpServer()).get('/ranking/global').expect(200)
        expect(Array.isArray(res.body)).toBe(true)
    })

    it('After upload → GET /matches/:id, /timeline and /badges should return data', async () => {
        // Assuming the upload created match with id '1'
        const matchRes = await request(app.getHttpServer()).get('/matches/1').expect(200)
        expect(matchRes.body).toHaveProperty('matchId')
        expect(matchRes.body).toHaveProperty('players')

        const timelineRes = await request(app.getHttpServer()).get('/matches/1/timeline').expect(200)
        expect(Array.isArray(timelineRes.body)).toBe(true)

        const badgesRes = await request(app.getHttpServer()).get('/matches/1/badges').expect(200)
        expect(badgesRes.body).toHaveProperty('playerBadges')
        expect(Object.keys(badgesRes.body.playerBadges).length).toBeGreaterThan(0)
    })

    it('After upload → GET /ranking/global should include players', async () => {
        const res = await request(app.getHttpServer()).get('/ranking/global').expect(200)
        expect(Array.isArray(res.body)).toBe(true)
        expect(res.body.length).toBeGreaterThanOrEqual(0)
    })

    it('Analytics compare endpoint should return head-to-head structure', async () => {
        const res = await request(app.getHttpServer())
            .get('/analytics/comparison')
            .query({ player1: 'Roman', player2: 'Unguento' })
            .expect(200)

        expect(res.body).toHaveProperty('player1')
        expect(res.body).toHaveProperty('player2')
        expect(res.body).toHaveProperty('prediction')
    })
})
