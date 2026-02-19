import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { PlayerStats } from './model/player.stats.model'
import { MatchEntity } from './model/match.model'

export const PlayerStatsSchema = SchemaFactory.createForClass(PlayerStats)
export const MatchSchema = SchemaFactory.createForClass(MatchEntity)
