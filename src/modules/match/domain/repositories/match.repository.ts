import { ParsedMatch } from 'src/shared/interfaces/match.interfaces'
import { MatchEntity } from '../../infra/persistence/match.schema'

export abstract class MatchRepository {
  abstract save(match: ParsedMatch): Promise<void>
  abstract findById(matchId: string): Promise<MatchEntity | null>
  abstract findAll(): Promise<MatchEntity[]>
}
