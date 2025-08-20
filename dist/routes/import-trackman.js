"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const sync_1 = require("csv-parse/sync");
const supabase_1 = require("../lib/supabase");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
exports.default = [
    upload.single('file'),
    (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        try {
            const csvString = req.file.buffer.toString('utf-8');
            const records = (0, sync_1.parse)(csvString, { columns: true, skip_empty_lines: true });
            let imported = {
                teams: 0,
                players: 0,
                games: 0,
                pitches: 0,
                pitching_metrics: 0,
                hitting_metrics: 0,
                pitch_trajectory: 0,
                hit_trajectory: 0
            };
            // 1. Insert into pitches first
            for (const row of records) {
                if (row.PitchUID) {
                    yield supabase_1.supabase.from('pitches').upsert([{
                            PitchUID: row.PitchUID,
                            GameID: row.GameID,
                            PitchNo: row.PitchNo,
                            Date: row.Date,
                            Time: row.Time,
                            Inning: row.Inning,
                            TopBottom: row["Top/Bottom"],
                            Outs: row.Outs,
                            Balls: row.Balls,
                            Strikes: row.Strikes,
                            PitcherID: row.PitcherId,
                            BatterID: row.BatterId,
                            CatcherID: row.CatcherId,
                            PitcherSet: row.PitcherSet,
                            PAofInning: row.PAofInning,
                            PitchofPA: row.PitchofPA,
                            TaggedPitchType: row.TaggedPitchType,
                            AutoPitchType: row.AutoPitchType,
                            PitchCall: row.PitchCall,
                            KorBB: row.KorBB,
                            TaggedHitType: row.TaggedHitType,
                            PlayResult: row.PlayResult,
                            OutsOnPlay: row.OutsOnPlay,
                            RunsScored: row.RunsScored,
                            Notes: row.Notes
                        }], { onConflict: 'PitchUID' });
                    imported.pitches++;
                }
            }
            // 2. Insert into all other tables except teams
            for (const row of records) {
                // PLAYERS
                if (row.PitcherId && row.PitcherName) {
                    yield supabase_1.supabase.from('players').upsert([{ PlayerID: row.PitcherId, Name: row.PitcherName, Throws: row.PitcherThrows, Side: row.PitcherSide, TeamID: row.TeamID }], { onConflict: 'PlayerID' });
                    imported.players++;
                }
                // GAMES
                if (row.GameID) {
                    yield supabase_1.supabase.from('games').upsert([{
                            GameID: row.GameID,
                            GameUID: row.GameUID,
                            GameForeignID: row.GameForeignID,
                            Date: row.GameDate,
                            Stadium: row.Stadium,
                            Level: row.Level,
                            League: row.League,
                            HomeTeam: row.HomeTeam,
                            AwayTeam: row.AwayTeam,
                            HomeTeamForeignID: row.HomeTeamForeignID,
                            AwayTeamForeignID: row.AwayTeamForeignID
                        }], { onConflict: 'GameID' });
                    imported.games++;
                }
                // PITCHING METRICS
                if (row.PitchUID && row.RelSpeed) {
                    yield supabase_1.supabase.from('pitching_metrics').upsert([{
                            PitchUID: row.PitchUID,
                            RelSpeed: row.RelSpeed,
                            VertRelAngle: row.VertRelAngle,
                            HorzRelAngle: row.HorzRelAngle,
                            SpinRate: row.SpinRate,
                            SpinAxis: row.SpinAxis,
                            Tilt: row.Tilt,
                            RelHeight: row.RelHeight,
                            RelSide: row.RelSide,
                            Extension: row.Extension,
                            VertBreak: row.VertBreak,
                            InducedVertBreak: row.InducedVertBreak,
                            HorzBreak: row.HorzBreak,
                            PlateLocHeight: row.PlateLocHeight,
                            PlateLocSide: row.PlateLocSide,
                            ZoneSpeed: row.ZoneSpeed,
                            VertApprAngle: row.VertApprAngle,
                            HorzApprAngle: row.HorzApprAngle,
                            ZoneTime: row.ZoneTime,
                            pfxx: row.pfxx,
                            pfxz: row.pfxz,
                            x0: row.x0,
                            y0: row.y0,
                            z0: row.z0,
                            vx0: row.vx0,
                            vy0: row.vy0,
                            vz0: row.vz0,
                            ax0: row.ax0,
                            ay0: row.ay0,
                            az0: row.az0,
                            EffectiveVelo: row.EffectiveVelo,
                            MaxHeight: row.MaxHeight,
                            MeasuredDuration: row.MeasuredDuration,
                            SpeedDrop: row.SpeedDrop,
                            PitchLastMeasuredX: row.PitchLastMeasuredX,
                            PitchLastMeasuredY: row.PitchLastMeasuredY,
                            PitchLastMeasuredZ: row.PitchLastMeasuredZ
                        }], { onConflict: 'PitchUID' });
                    imported.pitching_metrics++;
                }
                // HITTING METRICS
                if (row.PitchUID && row.ExitSpeed) {
                    yield supabase_1.supabase.from('hitting_metrics').upsert([{
                            PitchUID: row.PitchUID,
                            ExitSpeed: row.ExitSpeed,
                            Angle: row.Angle,
                            Direction: row.Direction,
                            HitSpinRate: row.HitSpinRate,
                            PositionAt110X: row.PositionAt110X,
                            PositionAt110Y: row.PositionAt110Y,
                            PositionAt110Z: row.PositionAt110Z,
                            Distance: row.Distance,
                            LastTrackedDistance: row.LastTrackedDistance,
                            Bearing: row.Bearing,
                            HangTime: row.HangTime,
                            ContactPositionX: row.ContactPositionX,
                            ContactPositionY: row.ContactPositionY,
                            ContactPositionZ: row.ContactPositionZ,
                            LocalDateTime: row.LocalDateTime,
                            UTCDateTime: row.UTCDateTime,
                            System: row.System
                        }], { onConflict: 'PitchUID' });
                    imported.hitting_metrics++;
                }
                // PITCH TRAJECTORY
                if (row.PitchUID && row.PitchTrajectoryXc0) {
                    yield supabase_1.supabase.from('pitch_trajectory').upsert([{
                            PitchUID: row.PitchUID,
                            PitchTrajectoryXc0: row.PitchTrajectoryXc0,
                            PitchTrajectoryXc1: row.PitchTrajectoryXc1,
                            PitchTrajectoryXc2: row.PitchTrajectoryXc2,
                            PitchTrajectoryYc0: row.PitchTrajectoryYc0,
                            PitchTrajectoryYc1: row.PitchTrajectoryYc1,
                            PitchTrajectoryYc2: row.PitchTrajectoryYc2,
                            PitchTrajectoryZc0: row.PitchTrajectoryZc0,
                            PitchTrajectoryZc1: row.PitchTrajectoryZc1,
                            PitchTrajectoryZc2: row.PitchTrajectoryZc2
                        }], { onConflict: 'PitchUID' });
                    imported.pitch_trajectory++;
                }
                // HIT TRAJECTORY
                if (row.PitchUID && row.HitTrajectoryXc0) {
                    yield supabase_1.supabase.from('hit_trajectory').upsert([{
                            PitchUID: row.PitchUID,
                            HitSpinAxis: row.HitSpinAxis,
                            HitTrajectoryXc0: row.HitTrajectoryXc0,
                            HitTrajectoryXc1: row.HitTrajectoryXc1,
                            HitTrajectoryXc2: row.HitTrajectoryXc2,
                            HitTrajectoryXc3: row.HitTrajectoryXc3,
                            HitTrajectoryXc4: row.HitTrajectoryXc4,
                            HitTrajectoryXc5: row.HitTrajectoryXc5,
                            HitTrajectoryXc6: row.HitTrajectoryXc6,
                            HitTrajectoryXc7: row.HitTrajectoryXc7,
                            HitTrajectoryXc8: row.HitTrajectoryXc8,
                            HitTrajectoryYc0: row.HitTrajectoryYc0,
                            HitTrajectoryYc1: row.HitTrajectoryYc1,
                            HitTrajectoryYc2: row.HitTrajectoryYc2,
                            HitTrajectoryYc3: row.HitTrajectoryYc3,
                            HitTrajectoryYc4: row.HitTrajectoryYc4,
                            HitTrajectoryYc5: row.HitTrajectoryYc5,
                            HitTrajectoryYc6: row.HitTrajectoryYc6,
                            HitTrajectoryYc7: row.HitTrajectoryYc7,
                            HitTrajectoryYc8: row.HitTrajectoryYc8,
                            HitTrajectoryZc0: row.HitTrajectoryZc0,
                            HitTrajectoryZc1: row.HitTrajectoryZc1,
                            HitTrajectoryZc2: row.HitTrajectoryZc2,
                            HitTrajectoryZc3: row.HitTrajectoryZc3,
                            HitTrajectoryZc4: row.HitTrajectoryZc4,
                            HitTrajectoryZc5: row.HitTrajectoryZc5,
                            HitTrajectoryZc6: row.HitTrajectoryZc6,
                            HitTrajectoryZc7: row.HitTrajectoryZc7,
                            HitTrajectoryZc8: row.HitTrajectoryZc8
                        }], { onConflict: 'PitchUID' });
                    imported.hit_trajectory++;
                }
            }
            // 3. Insert into teams last, using HomeTeamForeignID/AwayTeamForeignID and HomeTeam/AwayTeam
            for (const row of records) {
                if (row.HomeTeamForeignID && row.HomeTeam) {
                    yield supabase_1.supabase.from('teams').upsert([{ team_id: row.HomeTeamForeignID, name: row.HomeTeam }], { onConflict: 'team_id' });
                    imported.teams++;
                }
                if (row.AwayTeamForeignID && row.AwayTeam) {
                    yield supabase_1.supabase.from('teams').upsert([{ team_id: row.AwayTeamForeignID, name: row.AwayTeam }], { onConflict: 'team_id' });
                    imported.teams++;
                }
            }
            res.status(200).json({ success: true, imported });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    })
];
