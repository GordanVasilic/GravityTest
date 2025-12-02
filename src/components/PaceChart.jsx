import React, { useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PaceChart({ data }) {
    const isRide = data.type === 'ride';
    const avgHRAxis = data.heartRate?.avg || 140;
    const variabilityAxis = data.heartRate?.variability || 0;
    const hrMinAxis = Math.max(60, Math.floor(avgHRAxis * (1 - variabilityAxis / 100)) - 5);
    const hrMaxAxis = Math.min(220, Math.ceil(avgHRAxis * (1 + variabilityAxis / 100)) + 5);

    const formatSpeed = (paceInSeconds) => {
        const speed = 3600 / paceInSeconds;
        return speed.toFixed(1);
    };

    const chartData = useMemo(() => {
        const { distance, pace, inconsistency, elevationProfile, heartRate } = data;
        const points = [];
        const numPoints = 20;
        const step = distance / numPoints; // Distance step in km

        // Accumulators for fatigue/recovery
        let paceFatigue = 0;
        let hrFatigue = 0;

        for (let i = 0; i <= numPoints; i++) {
            const currentDist = i * step;
            let currentPace = pace;

            // Get elevation for this point
            let elevation = 0;
            if (elevationProfile && elevationProfile.length > 0) {
                const elevIndex = Math.floor((i / numPoints) * (elevationProfile.length - 1));
                elevation = elevationProfile[elevIndex] || 0;
            }

            // Calculate elevation change and gradient
            let elevationChange = 0;
            let gradient = 0; // Percentage
            if (i > 0 && elevationProfile && elevationProfile.length > 0) {
                const prevElevIndex = Math.floor(((i - 1) / numPoints) * (elevationProfile.length - 1));
                const currElevIndex = Math.floor((i / numPoints) * (elevationProfile.length - 1));
                const prevElev = elevationProfile[prevElevIndex] || 0;
                const currElev = elevationProfile[currElevIndex] || 0;
                elevationChange = currElev - prevElev;

                // Calculate gradient (rise / run)
                // step is in km, so we multiply by 1000 to get meters
                if (step > 0) {
                    gradient = (elevationChange / (step * 1000)) * 100;
                }
            }

            // --- PACE CALCULATION ---

            // 1. Gradient Impact (Immediate)
            // Steeper slope = bigger impact
            // Uphill: +10s/km per 1% gradient
            // Downhill: -5s/km per 1% gradient (less impact than uphill)
            let gradientPaceImpact = 0;
            if (gradient > 0) {
                gradientPaceImpact = gradient * 10;
            } else {
                gradientPaceImpact = gradient * 5;
            }

            // 2. Fatigue Impact (Cumulative)
            // If going uphill, fatigue increases. If flat/downhill, it recovers.
            if (gradient > 1) { // Significant uphill
                paceFatigue += gradient * 0.5; // Accumulate fatigue
            } else {
                paceFatigue -= 2; // Recover
            }
            paceFatigue = Math.max(0, Math.min(120, paceFatigue)); // Clamp fatigue (max 2 min/km penalty)

            // Scale physics impact by inconsistency setting
            // If inconsistency is 0, physics impact is 0 (flat line)
            // If inconsistency is 100, physics impact is full
            const physicsFactor = inconsistency / 50; // Normalize so 50% is "normal" physics, 100% is exaggerated

            currentPace += (gradientPaceImpact + paceFatigue) * physicsFactor;

            // 3. Inconsistency (Random)
            if (inconsistency > 0) {
                const variance = (Math.random() - 0.5) * 2 * (inconsistency / 100) * (pace * 0.5);
                currentPace += variance;
            }

            // Clamp pace
            currentPace = Math.max(150, Math.min(900, currentPace)); // 2:30 - 15:00 min/km


            // --- HEART RATE CALCULATION ---
            let hr = null;
            if (heartRate?.enabled) {
                const avgHR = heartRate.avg || 140;
                const variability = heartRate.variability || 10;
                const variabilityPct = Math.max(0, Math.min(variability, 40));
                let gradientHRImpact = 0;
                if (gradient > 0) {
                    gradientHRImpact = gradient * 2;
                } else {
                    gradientHRImpact = gradient * 1;
                }
                if (gradient > 1) {
                    hrFatigue += gradient * 0.1;
                } else {
                    hrFatigue -= 0.5;
                }
                hrFatigue = Math.max(0, Math.min(15, hrFatigue));
                const randomVariation = (Math.random() - 0.5) * (avgHR * variabilityPct / 100) * 0.5;
                const hrMin = Math.round(avgHR * (1 - variabilityPct / 100));
                const hrMax = Math.round(avgHR * (1 + variabilityPct / 100));
                hr = Math.round(avgHR + gradientHRImpact * (inconsistency / 50) + hrFatigue * (inconsistency / 50) + randomVariation);
                hr = Math.max(hrMin, Math.min(hrMax, hr));
                hr = Math.max(60, Math.min(200, hr));
            }

            const displayValue = isRide
                ? formatSpeed(currentPace)
                : `${Math.floor(currentPace / 60)}:${(Math.round(currentPace) % 60).toString().padStart(2, '0')}`;

            points.push({
                name: `${currentDist.toFixed(1)}`,
                distance: currentDist,
                pace: Math.round(currentPace),
                speed: parseFloat(formatSpeed(currentPace)),
                displayPace: displayValue,
                elevation: Math.round(elevation),
                heartRate: hr
            });
        }
        return points;
    }, [data.distance, data.pace, data.inconsistency, data.elevationProfile, data.heartRate, data.type, isRide]);

    const formatPaceAxis = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover border border-border rounded-md p-2 shadow-lg">
                    <p className="text-xs text-muted-foreground mb-1">{`${payload[0].payload.distance.toFixed(2)} km`}</p>
                    <p className="text-xs font-medium text-purple-600">
                        {isRide
                            ? `Speed: ${payload[0].payload.displayPace} km/h`
                            : `Pace: ${payload[0].payload.displayPace} /km`
                        }
                    </p>
                    <p className="text-xs font-medium text-orange-600">{`Elevation: ${payload[0].payload.elevation} m`}</p>
                    {payload[0].payload.heartRate && (
                        <p className="text-xs font-medium text-red-600">{`Heart Rate: ${payload[0].payload.heartRate} BPM`}</p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-[140px] w-full">
            {data.distance === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs font-medium bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    Draw a route to view analysis
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#9ca3af" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={false}
                            interval="preserveStartEnd"
                            minTickGap={30}
                        />
                        <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 9, fill: '#3b82f6' }}
                            tickFormatter={isRide ? undefined : formatPaceAxis}
                            domain={isRide ? ['dataMin - 2', 'dataMax + 2'] : ['dataMin - 30', 'dataMax + 30']}
                            width={30}
                            tickLine={false}
                            axisLine={false}
                            hide={false}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 9, fill: '#ef4444' }}
                            domain={data.heartRate?.enabled ? [hrMinAxis, hrMaxAxis] : [0, 'dataMax + 50']}
                            width={30}
                            tickLine={false}
                            axisLine={false}
                            hide={!data.heartRate?.enabled && true}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                            labelStyle={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}
                            cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }}
                            formatter={(value, name) => {
                                if (name === 'pace') return isRide ? [`${formatSpeed(value)} km/h`, 'Speed'] : [formatPaceAxis(value), 'Pace'];
                                if (name === 'speed') return [`${value} km/h`, 'Speed'];
                                if (name === 'elevation') return [`${value} m`, 'Elevation'];
                                if (name === 'heartRate') return [`${value} bpm`, 'Heart Rate'];
                                return [value, name];
                            }}
                            labelFormatter={(label) => `${label} km`}
                        />
                        <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="elevation"
                            stroke="#9ca3af"
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#colorElevation)"
                            isAnimationActive={false}
                        />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey={isRide ? "speed" : "pace"}
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            dot={false}
                            isAnimationActive={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        {data.heartRate?.enabled && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="heartRate"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
