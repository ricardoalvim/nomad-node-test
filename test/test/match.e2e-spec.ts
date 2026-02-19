import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { Connection } from 'mongoose'
import { getConnectionToken } from '@nestjs/mongoose'
import { AppModule } from 'src/app.module'

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

  it('/matches/upload (POST) - Deve processar log e retornar 201', () => {
    const logContent =
      '23/04/2019 15:34:22 - New match 1 has started\n' +
      '23/04/2019 15:36:04 - Roman killed Nick using M16\n' +
      '23/04/2019 15:39:22 - Match 1 has ended'

    return request(app.getHttpServer())
      .post('/matches/upload')
      .attach('file', Buffer.from(logContent), 'log.txt')
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toBeDefined()
      })
  })

  it('/matches/:id (GET) - Deve retornar o ranking da partida processada', async () => {
    const response = await request(app.getHttpServer()).get('/matches/1').expect(200)

    expect(response.body.matchId).toBe('1')
    expect(response.body.ranking[0].name).toBe('Roman')
    expect(response.body.ranking[0].frags).toBe(1)
  })

  it('/matches/upload (POST) - Deve falhar se não houver ficheiro (400)', () => {
    return request(app.getHttpServer()).post('/matches/upload').expect(400)
  })

  it('/matches/:id (GET) - Deve retornar 404 para partida inexistente', () => {
    return request(app.getHttpServer())
      .get('/matches/999999')
      .expect(404)
  })

  it('/matches/upload (POST) - Deve processar logs complexos com World kills', async () => {
    const complexLog =
      '23/04/2019 15:34:22 - New match 2 has started\n' +
      '23/04/2019 15:36:04 - <world> killed Roman by MOD_FALLING\n' +
      '23/04/2019 15:36:05 - Nick killed Roman using M16\n' +
      '23/04/2019 15:39:22 - Match 2 has ended'

    await request(app.getHttpServer())
      .post('/matches/upload')
      .attach('file', Buffer.from(complexLog), 'complex.txt')
      .expect(201)

    const res = await request(app.getHttpServer()).get('/matches/2')

    // Se o Roman morreu pelo <world>, o frag dele deve ser -1 (ou 0 dependendo da regra que aplicamos)
    // E o Nick deve ter 1.
    const roman = res.body.ranking.find((p) => p.name === 'Roman')
    expect(roman.frags).toBeLessThan(1)
  })
})

describe('Fluxo Completo de Partida (e2e)', () => {
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

  it('Deve processar log, salvar no Mongo e atualizar Ranking Global', async () => {
    const logData = `
23/04/2019 15:34:22 - New match 1 has started
23/04/2019 15:36:04 - Roman killed Nick using M16
23/04/2019 15:36:05 - Roman killed Nick using M16
23/04/2019 15:39:22 - Match 1 has ended
`.trim()

    await request(app.getHttpServer())
      .post('/matches/upload')
      .attach('file', Buffer.from(logData), 'log.txt')
      .expect(201)

    const matchRes = await request(app.getHttpServer())
      .get('/matches/1')
      .expect(200)

    expect(matchRes.body.ranking[0].name).toBe('Roman')
    expect(matchRes.body.ranking[0].frags).toBe(2)

    const globalRes = await request(app.getHttpServer())
      .get('/ranking/global')
      .expect(200)

    const romanGlobal = globalRes.body.find(p => p.name === 'Roman')
    expect(romanGlobal.totalFrags).toBeGreaterThanOrEqual(2)
  })
})