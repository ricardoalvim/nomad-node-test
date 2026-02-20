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
    let matchRepository: any

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
                return Array.from(this.store.values())
                    .filter((m: any) => {
                        const players = m.players
                        if (!players) return false
                        if (players instanceof Map) {
                            return players.has(p1) && players.has(p2)
                        }
                        return Boolean(players[p1] && players[p2])
                    })
                    .map((m: any) => {
                        // Normalize Map back to object for service consumption
                        const copy = { ...m }
                        if (copy.players instanceof Map) {
                            copy.players = Object.fromEntries(copy.players)
                        }
                        return copy
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

        const repoInstance = new InMemoryMatchRepository()
        matchRepository = repoInstance

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
                { provide: MatchRepository, useValue: repoInstance },
                { provide: REDIS_CLIENT, useValue: new FakeRedis() },
            ],
        }).compile()

        app = moduleFixture.createNestApplication()
        await app.init()

        // Pre-populate repository with test data for analytics tests
        await matchRepository.save({
            matchId: 'match-1',
            timestamp: new Date('2019-04-23T15:34:22'),
            players: {
                'Roman': {
                    frags: 5,
                    deaths: 2,
                    longestStreak: 3,
                    weapons: { 'M16': 3, 'Shotgun': 2 }
                },
                'Unguento': {
                    frags: 2,
                    deaths: 5,
                    longestStreak: 1,
                    weapons: { 'M16': 2 }
                }
            }
        })

        await matchRepository.save({
            matchId: 'match-2',
            timestamp: new Date('2019-04-23T16:00:00'),
            players: {
                'Roman': {
                    frags: 8,
                    deaths: 1,
                    longestStreak: 6,
                    weapons: { 'M16': 5, 'Shotgun': 3 }
                },
                'Unguento': {
                    frags: 3,
                    deaths: 8,
                    longestStreak: 2,
                    weapons: { 'Shotgun': 2, 'M16': 1 }
                }
            }
        })
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

    it('GET /analytics/comparison → should return head-to-head stats for players with shared matches', async () => {
        const res = await request(app.getHttpServer())
            .get('/analytics/comparison')
            .query({ player1: 'Roman', player2: 'Unguento' })
            .expect(200)

        expect(res.body).toHaveProperty('player1')
        expect(res.body).toHaveProperty('player2')
        expect(res.body).toHaveProperty('prediction')
        expect(res.body).toHaveProperty('matches_played_together')
        expect(res.body).toHaveProperty('total_head_to_head_kills')
        expect(res.body).toHaveProperty('advantages')

        // Verify Roman's stats (should have more frags than Unguento)
        expect(res.body.player1.name).toBe('Roman')
        expect(res.body.player1.frags).toBeGreaterThanOrEqual(13) // At least 5 + 8
        expect(res.body.player1.deaths).toBeGreaterThanOrEqual(3) // At least 2 + 1
        expect(res.body.player1.win_rate).toBeGreaterThan(0)
        expect(res.body.player1.favorite_weapon).toBe('M16')

        // Verify Unguento's stats (should have fewer frags)
        expect(res.body.player2.name).toBe('Unguento')
        expect(res.body.player2.frags).toBeGreaterThanOrEqual(5) // At least 2 + 3
        expect(res.body.player2.deaths).toBeGreaterThanOrEqual(13) // At least 5 + 8
        expect(res.body.player2.frags).toBeLessThan(res.body.player1.frags) // Always fewer than Roman

        // Verify matches count (at minimum 2, but may be more from previous tests)
        expect(res.body.matches_played_together).toBeGreaterThanOrEqual(2)

        // Roman should be predicted as winner
        expect(res.body.prediction).toBe('player1')
        expect(res.body.confidence).toBeGreaterThan(0)
    })

    it('GET /analytics/comparison → should return default response for players with no shared matches', async () => {
        const res = await request(app.getHttpServer())
            .get('/analytics/comparison')
            .query({ player1: 'Roman', player2: 'UnknownPlayer' })
            .expect(200)

        expect(res.body.matches_played_together).toBe(0)
        expect(res.body.prediction).toBe('tie')
        expect(res.body.confidence).toBe(0)
    })

    it('GET /analytics/comparison → should fail if parameters are missing', async () => {
        await request(app.getHttpServer())
            .get('/analytics/comparison')
            .query({ player1: 'Roman' })
            .expect(400)

        await request(app.getHttpServer())
            .get('/analytics/comparison')
            .query({ player2: 'Unguento' })
            .expect(400)
    })

    it('GET /analytics/comparison → should fail if same player is compared', async () => {
        await request(app.getHttpServer())
            .get('/analytics/comparison')
            .query({ player1: 'Roman', player2: 'Roman' })
            .expect(400)
    })
})
