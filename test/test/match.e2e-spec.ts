import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { Connection } from 'mongoose'
import { getConnectionToken } from '@nestjs/mongoose'
import { AppModule } from 'src/app.module'
import { PlayerName } from 'src/shared/enum/player.enum'
import { ApiRoutes } from 'src/shared/enum/api-routes.enum'

describe('MatchController (e2e)', () => {
  let app: INestApplication
  let mongooseConnection: Connection

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()

    mongooseConnection = moduleFixture.get<Connection>(getConnectionToken())
  })

  afterAll(async () => {
    await mongooseConnection.dropDatabase()
    await app.close()
  })

  it('/matches/upload (POST) - Should process log and return 201', () => {
    const logContent = `23/04/2019 15:34:22 - New match 1 has started
23/04/2019 15:36:04 - ${PlayerName.Roman} killed ${PlayerName.Nick} using M16
23/04/2019 15:39:22 - Match 1 has ended`

    return request(app.getHttpServer())
      .post(ApiRoutes.MatchesUpload)
      .attach('file', Buffer.from(logContent), 'log.txt')
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toBeDefined()
      })
  })

  it('/matches/:id (GET) - Should return processed match ranking', async () => {
    const response = await request(app.getHttpServer()).get(ApiRoutes.MatchesById('1')).expect(200)

    expect(response.body.matchId).toBe('1')
    expect(response.body.ranking[0].name).toBe(PlayerName.Roman)
    expect(response.body.ranking[0].frags).toBe(1)
  })

  it('/matches/upload (POST) - Should fail if no file provided (400)', () => {
    return request(app.getHttpServer()).post(ApiRoutes.MatchesUpload).expect(400)
  })

  it('/matches/:id (GET) - Should return 404 for non-existent match', () => {
    return request(app.getHttpServer())
      .get('/matches/999999')
      .expect(404)
  })

  it('/matches/upload (POST) - Should process complex logs with World kills', async () => {
    const complexLog = `23/04/2019 15:34:22 - New match 2 has started
23/04/2019 15:36:04 - ${PlayerName.World} killed ${PlayerName.Roman} by MOD_FALLING
23/04/2019 15:36:05 - ${PlayerName.Nick} killed ${PlayerName.Roman} using M16
23/04/2019 15:39:22 - Match 2 has ended`

    await request(app.getHttpServer())
      .post(ApiRoutes.MatchesUpload)
      .attach('file', Buffer.from(complexLog), 'complex.txt')
      .expect(201)

    const res = await request(app.getHttpServer()).get(ApiRoutes.MatchesById('2'))

    // If Roman died by <world>, his frag count should be -1 or 0
    // Nick should have 1
    const roman = res.body.ranking.find((p) => p.name === PlayerName.Roman)
    expect(roman.frags).toBeLessThan(1)
  })
})

describe('Complete Match Flow (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('Should process log, save to Mongo and update Global Ranking', async () => {
    const logData = `
  23/04/2019 15:34:22 - New match 1 has started
  23/04/2019 15:36:04 - ${PlayerName.Roman} killed ${PlayerName.Nick} using M16
  23/04/2019 15:36:05 - ${PlayerName.Roman} killed ${PlayerName.Nick} using M16
  23/04/2019 15:39:22 - Match 1 has ended
  `.trim()

    await request(app.getHttpServer())
      .post(ApiRoutes.MatchesUpload)
      .attach('file', Buffer.from(logData), 'log.txt')
      .expect(201)

    const matchRes = await request(app.getHttpServer())
      .get(ApiRoutes.MatchesById('1'))
      .expect(200)

    expect(matchRes.body.ranking[0].name).toBe(PlayerName.Roman)
    expect(matchRes.body.ranking[0].frags).toBe(2)

    const globalRes = await request(app.getHttpServer())
      .get(ApiRoutes.RankingGlobal)
      .expect(200)

    const romanGlobal = globalRes.body.find(p => p.name === PlayerName.Roman)
    expect(romanGlobal.totalFrags).toBeGreaterThanOrEqual(2)
  })
})