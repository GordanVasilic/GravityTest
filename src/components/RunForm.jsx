import React from 'react';
import { Calendar, Clock, MapPin, Type, Heart, TrendingUp, Timer, Mountain, Gauge, ChevronDown, Bike, Footprints } from 'lucide-react';
import { downloadGPX, downloadTCX } from '../utils/gpxGenerator';
import { consumeToken } from '../utils/TokenStore';

export default function RunForm({ runData, setRunData, openBuyTokens }) {
    const handleDownload = () => {
        const ok = consumeToken();
        if (!ok) {
            openBuyTokens?.();
            return;
        }
        downloadGPX(runData);
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const formatPace = (paceInSeconds) => {
        const min = Math.floor(paceInSeconds / 60);
        const sec = Math.floor(paceInSeconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const formatSpeed = (paceInSeconds) => {
        // Convert pace (sec/km or sec/mi) to speed (km/h or mi/h)
        const speed = 3600 / paceInSeconds;
        return speed.toFixed(1);
    };

    return (
        <div className="space-y-8 font-sans">
            {/* Top Controls: Type & Unit */}
            <div className="flex items-center gap-2">
                {/* Type Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setRunData({ ...runData, type: 'run' })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${runData.type === 'run' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Footprints className="w-3.5 h-3.5" />
                        Run
                    </button>
                    <button
                        onClick={() => setRunData({ ...runData, type: 'ride' })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${runData.type === 'ride' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Bike className="w-3.5 h-3.5" />
                        Ride
                    </button>
                </div>

                {/* Unit Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => {
                            if ((runData.paceUnit || 'km') !== 'km') {
                                setRunData({
                                    ...runData,
                                    paceUnit: 'km',
                                    distance: runData.distance * 1.60934,
                                    pace: runData.pace / 1.60934
                                });
                            }
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${(!runData.paceUnit || runData.paceUnit === 'km') ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        KM
                    </button>
                    <button
                        onClick={() => {
                            if (runData.paceUnit !== 'mi') {
                                setRunData({
                                    ...runData,
                                    paceUnit: 'mi',
                                    distance: runData.distance * 0.621371,
                                    pace: runData.pace / 0.621371
                                });
                            }
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${runData.paceUnit === 'mi' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        MI
                    </button>
                </div>
            </div>
            {/* Activity Stats Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500">Activity Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                    {/* Distance - Orange */}
                    <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex flex-col items-start justify-center transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-full bg-orange-500 text-white">
                                <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Distance</span>
                        </div>
                        <div className="text-2xl font-black text-gray-800">
                            {runData.distance.toFixed(2)} <span className="text-sm font-bold text-orange-600">{runData.paceUnit || 'km'}</span>
                        </div>
                    </div>

                    {/* Time - Blue */}
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-start justify-center transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-full bg-blue-500 text-white">
                                <Timer className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Time</span>
                        </div>
                        <div className="text-2xl font-black text-gray-800">
                            {formatTime(runData.time)}
                        </div>
                    </div>

                    {/* Elevation - Green */}
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-start justify-center transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-full bg-emerald-500 text-white">
                                <Mountain className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Elevation</span>
                        </div>
                        <div className="text-2xl font-black text-gray-800">
                            {runData.elevationGain || 0} <span className="text-sm font-bold text-emerald-600">m</span>
                        </div>
                    </div>

                    {/* Avg Pace/Speed - Purple */}
                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 flex flex-col items-start justify-center transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-full bg-purple-500 text-white">
                                <Gauge className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                                {runData.type === 'ride' ? 'Avg Speed' : 'Avg Pace'}
                            </span>
                        </div>
                        <div className="text-2xl font-black text-gray-800">
                            {runData.type === 'ride'
                                ? <>{formatSpeed(runData.pace)} <span className="text-sm font-bold text-purple-600">{runData.paceUnit || 'km'}/h</span></>
                                : <>{formatPace(runData.pace)} <span className="text-sm font-bold text-purple-600">/{runData.paceUnit || 'km'}</span></>
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Pace & Heart Rate Settings */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-6">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    Pace & Heart Rate Settings
                </h3>

                {/* Average Pace/Speed Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Gauge className="w-3 h-3 text-orange-500" />
                            {runData.type === 'ride' ? `Average Speed (${runData.paceUnit || 'km'}/h)` : `Average Pace (${runData.paceUnit || 'km'})`}
                        </label>
                        <div className="text-sm font-bold text-orange-600">
                            {runData.type === 'ride' ? formatSpeed(runData.pace) : formatPace(runData.pace)}
                        </div>
                    </div>
                    <input
                        type="range"
                        min="180"
                        max="600"
                        value={runData.pace}
                        onChange={(e) => setRunData({ pace: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>3:00</span>
                        <span>10:00</span>
                    </div>
                </div>

                {/* Pace Inconsistency */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3 text-blue-500" />
                            Pace Inconsistency
                        </label>
                        <div className="text-sm font-bold text-orange-600">
                            {runData.inconsistency}%
                        </div>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={runData.inconsistency}
                        onChange={(e) => setRunData({ inconsistency: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>0%</span>
                        <span>50%</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium pt-1">
                        {runData.inconsistency < 30 ? 'Steady Effort' :
                            runData.inconsistency < 70 ? 'Natural Variation' :
                                'High pace variation (challenging workout style)'}
                    </div>
                </div>

                {/* Heart Rate Toggle */}
                <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between pt-2">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                            Include Heart Rate Data
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={runData.heartRate?.enabled}
                                onChange={(e) => setRunData({
                                    heartRate: { ...runData.heartRate, enabled: e.target.checked }
                                })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-400"></div>
                        </label>
                    </div>

                    {runData.heartRate?.enabled && (
                        <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="font-medium text-slate-600">Average Heart Rate</span>
                                    <span className="font-bold text-orange-500">{runData.heartRate.avg || 140} bpm</span>
                                </div>
                                <input
                                    type="range"
                                    min="100"
                                    max="200"
                                    value={runData.heartRate.avg || 140}
                                    onChange={(e) => setRunData({
                                        heartRate: { ...runData.heartRate, avg: parseInt(e.target.value) }
                                    })}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="font-medium text-slate-600">Heart Rate Variability</span>
                                    <span className="font-bold text-orange-500">{runData.heartRate.variability || 0}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="60"
                                    value={runData.heartRate.variability || 0}
                                    onChange={(e) => setRunData({
                                        heartRate: { ...runData.heartRate, variability: parseInt(e.target.value) }
                                    })}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-600"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Run Details Section */}
            <div className="space-y-5 pt-6 border-t border-gray-100">
                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Run Name</label>
                    <input
                        type="text"
                        value={runData.name}
                        onChange={(e) => setRunData({ ...runData, name: e.target.value })}
                        className="flex h-10 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Morning Run"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={runData.date}
                                onChange={(e) => setRunData({ ...runData, date: e.target.value })}
                                className="flex h-10 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Time</label>
                        <div className="relative">
                            <input
                                type="time"
                                value={runData.startTime}
                                onChange={(e) => setRunData({ ...runData, startTime: e.target.value })}
                                className="flex h-10 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</label>
                    <textarea
                        value={runData.description}
                        onChange={(e) => setRunData({ ...runData, description: e.target.value })}
                        className="flex min-h-[80px] w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                        placeholder="How did it go?"
                    />
                </div>
            </div>

            {/* Download Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                    onClick={handleDownload}
                    disabled={!runData.route || runData.route.length < 2}
                    className={`flex flex-col items-center justify-center h-12 rounded bg-primary text-white transition-colors shadow-sm relative overflow-hidden group ${(!runData.route || runData.route.length < 2) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-700 hover:shadow'}`}
                >
                    <span className="text-sm font-bold">Download GPX</span>
                    <span className="text-[10px] font-medium opacity-90 bg-black/10 px-2 py-0.5 rounded-full mt-0.5">1 Token</span>
                </button>
                <button
                    onClick={() => {
                        const ok = consumeToken();
                        if (!ok) {
                            openBuyTokens?.();
                            return;
                        }
                        downloadTCX(runData)
                    }}
                    disabled={!runData.route || runData.route.length < 2}
                    className={`flex flex-col items-center justify-center h-12 rounded bg-white border border-gray-300 text-gray-700 transition-colors shadow-sm relative overflow-hidden group ${(!runData.route || runData.route.length < 2) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:shadow'}`}
                >
                    <span className="text-sm font-bold">Download TCX</span>
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-0.5 group-hover:bg-gray-200 transition-colors">1 Token</span>
                </button>
            </div>
        </div>
    );
}
