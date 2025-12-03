import React, { useEffect, useState } from 'react';
import MapEditor from './components/MapEditor';
import RunForm from './components/RunForm';
import PaceChart from './components/PaceChart';
import { Map, Activity, Clock, Zap, Heart, Maximize2, Minimize2, User, Menu, ChevronDown, Plus } from 'lucide-react';
import TokensModal from './components/TokensModal';
import { getTokens, addTokens } from './utils/TokenStore';

function App() {
    const [runDataState, setRunDataState] = useState({
        distance: 0, // km
        time: 0, // seconds
        pace: 360, // seconds per km
        type: 'run',
        name: 'Morning Run',
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        description: 'Easy morning jog',
        route: [], // coordinates
        inconsistency: 10, // 0-100%
        heartRate: { enabled: false, avg: 140, variability: 10 },
        mapStyle: 'streets-v11',
        elevationGain: 0, // meters
        elevationProfile: [], // array of elevation values
        paceUnit: 'km' // 'km' or 'mi'
    });

    const [chartVisible, setChartVisible] = useState(true);
    const [chartExpanded, setChartExpanded] = useState(false);
    const [tokensModalOpen, setTokensModalOpen] = useState(false);
    const [tokenBalance, setTokenBalance] = useState(0);
    const [banner, setBanner] = useState('');

    // Smart setter to handle dependencies
    const setRunData = (newData) => {
        // If newData is a function (updater), resolve it first
        if (typeof newData === 'function') {
            setRunDataState(prev => {
                const resolvedData = newData(prev);
                return calculateDerivedState(prev, resolvedData);
            });
        } else {
            setRunDataState(prev => calculateDerivedState(prev, { ...prev, ...newData }));
        }
    };

    const calculateDerivedState = (prev, updated) => {
        // If distance changed, update time based on current pace
        if (updated.distance !== prev.distance) {
            updated.time = updated.distance * updated.pace;
        }

        // If pace changed, update time based on current distance
        else if (updated.pace !== prev.pace) {
            updated.time = updated.distance * updated.pace;
        }

        // If time changed, update pace based on current distance
        else if (updated.time !== prev.time) {
            if (updated.distance > 0) {
                updated.pace = updated.time / updated.distance;
            }
        }

        return updated;
    };

    const verificationRef = React.useRef(false);

    useEffect(() => {
        setTokenBalance(getTokens());
        const onChange = (e) => setTokenBalance(e.detail?.tokens ?? getTokens());
        window.addEventListener('tokens:changed', onChange);

        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');

        if (sessionId && !verificationRef.current) {
            verificationRef.current = true;
            (async () => {
                try {
                    const res = await fetch('/api/checkout/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ session_id: sessionId })
                    });
                    const data = await res.json();
                    if (data?.tokens) {
                        addTokens(data.tokens);
                        setBanner(`Added ${data.tokens} tokens`);
                        setTimeout(() => setBanner(''), 4000);
                    }
                } catch (e) {
                    console.error('Verification failed', e);
                    verificationRef.current = false; // Allow retry on error? Or maybe not.
                }
                finally {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('session_id');
                    window.history.replaceState({}, '', url.toString());
                }
            })();
        }
        return () => window.removeEventListener('tokens:changed', onChange);
    }, []);

    return (
        <div className="flex flex-col h-screen w-full bg-background text-foreground font-sans">
            {/* Navigation Bar */}
            <nav className="h-16 bg-white border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0 z-50 shadow-sm">
                <div className="flex items-center gap-8">
                    <div className="text-primary font-black text-3xl tracking-tighter italic">FakeMyRide</div>
                </div>
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">{tokenBalance} tokens</div>
                        <button onClick={() => setTokensModalOpen(true)} className="flex items-center gap-1 text-sm font-bold text-white bg-primary px-3 py-1.5 rounded hover:bg-orange-700 transition-colors shadow-sm">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Buy Tokens</span>
                        </button>
                    </div>
                </div>
            </nav>

            {banner && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-2 text-center">{banner}</div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Left Panel - Map */}
                <div className="relative w-full md:flex-1 h-1/2 md:h-full bg-gray-100 border-r border-border">
                    <MapEditor runData={runDataState} setRunData={setRunData} />

                    {/* Pace Chart Overlay - Compact Floating Card */}
                    {chartVisible && (
                        <div className={`absolute bottom-6 left-6 z-10 bg-white/95 backdrop-blur-sm p-0 rounded-lg shadow-lg border border-gray-200 transition-all duration-300 ease-in-out ${chartExpanded ? 'right-6' : 'w-[400px]'
                            }`}>
                            <div className="flex items-center justify-between p-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-xs text-gray-600 uppercase tracking-wider">Pace Analysis</h3>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setChartExpanded(!chartExpanded)}
                                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 transition-colors"
                                        title={chartExpanded ? "Collapse chart" : "Expand chart"}
                                    >
                                        {chartExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={() => setChartVisible(false)}
                                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 hover:text-gray-900 transition-colors"
                                        title="Hide chart"
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <PaceChart data={runDataState} />
                            </div>
                        </div>
                    )}

                    {/* Toggle Button when Chart is Hidden */}
                    {!chartVisible && (
                        <button
                            onClick={() => setChartVisible(true)}
                            className="absolute bottom-6 left-6 z-10 p-3 bg-white rounded-full shadow-lg border border-gray-200 hover:scale-110 transition-all group text-primary"
                            title="Show Pace Profile"
                        >
                            <Activity className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Right Panel - Controls */}
                <div className="w-full md:w-[360px] h-1/2 md:h-full overflow-y-auto bg-white flex flex-col shadow-xl z-20 shrink-0">
                    <div className="px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 tracking-tight italic">
                            <div className="w-1.5 h-6 bg-primary skew-x-[-12deg]"></div>
                            CREATE ACTIVITY
                        </h2>
                    </div>

                    <div className="px-6 py-4">
                        <RunForm runData={runDataState} setRunData={setRunData} openBuyTokens={() => setTokensModalOpen(true)} />
                    </div>
                </div>
            </div>
            <TokensModal open={tokensModalOpen} onClose={() => setTokensModalOpen(false)} />
        </div>
    );
}

export default App;
