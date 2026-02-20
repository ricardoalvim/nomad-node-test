import { Prop, Schema } from '@nestjs/mongoose'
import { Document } from 'mongoose'
import { PlayerStatsSchema } from '../match.schema'
import { PlayerStats } from './player.stats.model'

@Schema({ timestamps: true, collection: 'matches' })
export class MatchEntity extends Document {
  @Prop({ required: true, unique: true })
  matchId: string

  @Prop({ required: true })
  startTime: Date

  @Prop()
  endTime: Date

  @Prop({ type: Map, of: PlayerStatsSchema, default: {} })
  players: Map<string, PlayerStats>

  @Prop()
  winningWeapon: string
}