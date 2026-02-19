import { Prop, Schema } from '@nestjs/mongoose'

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