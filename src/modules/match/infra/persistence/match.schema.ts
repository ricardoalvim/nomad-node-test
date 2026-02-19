import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema({ _id: false })
export class PlayerStats {
    @Prop({ required: true })
    name: string

    @Prop({ default: 0 })
    frags: number

    @Prop({ default: 0 })
    deaths: number

    @Prop({ default: 0 })
    friendlyFire: number

    @Prop({ default: 0 })
    longestStreak: number

    @Prop({ type: [String], default: [] })
    awards: string[]

    @Prop({ type: Map, of: Number, default: {} })
    weapons: Map<string, number>
}

export const PlayerStatsSchema = SchemaFactory.createForClass(PlayerStats)

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

export const MatchSchema = SchemaFactory.createForClass(MatchEntity)