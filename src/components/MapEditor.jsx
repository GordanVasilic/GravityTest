import React, { useEffect, useRef, useCallback, useState } from 'react';
import Map, { NavigationControl, Source, Layer, Marker, GeolocateControl } from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
import GeocoderControl from './GeocoderControl';
import { Undo2, Trash2, Map as MapIcon, Info } from 'lucide-react';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import ConfirmationModal from './ConfirmationModal';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZ29nb2dhZ2E3IiwiYSI6ImNtZDNqOTdsbTA1eHIya3M5eTg1cWtvZ2IifQ.x3Sc3Yvvk5KV5bryO2WRmA';

export default function MapEditor({ runData, setRunData }) {
    const mapRef = useRef(null);
    const geolocateControlRef = useRef(null);
    const [waypoints, setWaypoints] = useState([]);
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [viewport, setViewport] = useState({
        longitude: -74.0060,
        latitude: 40.7128,
        zoom: 13
    });
    const [pointToDelete, setPointToDelete] = useState(null);
    const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');

    const MAP_STYLES = [
        { name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
        { name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
        { name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
        { name: 'Light', url: 'mapbox://styles/mapbox/light-v11' },
        { name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v12' }
    ];

    // Fetch elevation data for route
    const fetchElevation = useCallback(async (coordinates) => {
        try {
            // Sample points along the route (max 100 points for API limit)
            const sampleSize = Math.min(coordinates.length, 100);
            const step = Math.max(1, Math.floor(coordinates.length / sampleSize));
            const sampledPoints = coordinates.filter((_, i) => i % step === 0);

            // Open-Elevation API
            const locations = sampledPoints.map(coord => ({
                latitude: coord[1],
                longitude: coord[0]
            }));

            const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ locations })
            });

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                // Calculate elevation gain and create profile
                let elevationGain = 0;
                const elevationProfile = data.results.map(r => r.elevation);

                for (let i = 1; i < data.results.length; i++) {
                    const diff = data.results[i].elevation - data.results[i - 1].elevation;
                    if (diff > 0) {
                        elevationGain += diff;
                    }
                }

                return {
                    elevationGain: Math.round(elevationGain),
                    elevationProfile: elevationProfile
                };
            }
            return { elevationGain: 0, elevationProfile: [] };
        } catch (error) {
            console.error('Error fetching elevation:', error);
            return { elevationGain: 0, elevationProfile: [] };
        }
    }, []);

    // Fetch route from Mapbox Directions API
    const fetchRoute = useCallback(async (points) => {
        if (points.length < 2) {
            setRouteGeometry(null);
            if (points.length === 0) {
                setRunData(prev => ({
                    ...prev,
                    distance: 0,
                    route: [],
                    elevationProfile: []
                }));
            }
            return;
        }

        const coordinates = points.map(p => `${p.lng},${p.lat}`).join(';');
        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes[0]) {
                const route = data.routes[0];
                setRouteGeometry(route.geometry);

                // Calculate distance
                const distance = route.distance / 1000; // Convert to km

                // Fetch real elevation data
                const elevationData = await fetchElevation(route.geometry.coordinates);

                setRunData(prev => ({
                    ...prev,
                    distance: parseFloat(distance.toFixed(2)),
                    route: route.geometry.coordinates,
                    elevationGain: elevationData.elevationGain,
                    elevationProfile: elevationData.elevationProfile
                }));
            }
        } catch (error) {
            console.error('Error fetching route:', error);
        }
    }, [setRunData, fetchElevation]);

    // Handle map click to add waypoint
    const handleMapClick = useCallback((event) => {
        // Don't add waypoint if we're dragging
        if (draggingIndex !== null) return;

        const { lngLat } = event;
        const newWaypoints = [...waypoints, { lng: lngLat.lng, lat: lngLat.lat }];
        setWaypoints(newWaypoints);
        fetchRoute(newWaypoints);
    }, [waypoints, fetchRoute, draggingIndex]);

    // Handle waypoint drag
    const onMarkerDragStart = useCallback((index) => {
        setDraggingIndex(index);
    }, []);

    const onMarkerDrag = useCallback((event, index) => {
        const { lngLat } = event;
        const newWaypoints = [...waypoints];
        newWaypoints[index] = { lng: lngLat.lng, lat: lngLat.lat };
        setWaypoints(newWaypoints);
    }, [waypoints]);

    const onMarkerDragEnd = useCallback((event, index) => {
        const { lngLat } = event;
        const newWaypoints = [...waypoints];
        newWaypoints[index] = { lng: lngLat.lng, lat: lngLat.lat };
        setWaypoints(newWaypoints);
        fetchRoute(newWaypoints);
        setDraggingIndex(null);
    }, [waypoints, fetchRoute]);

    // Clear route
    const clearRoute = useCallback(() => {
        setWaypoints([]);
        setRouteGeometry(null);
        setRunData(prev => ({
            ...prev,
            distance: 0,
            route: [],
            elevationProfile: []
        }));
    }, [setRunData]);

    // Undo last waypoint
    const undoLastPoint = useCallback(() => {
        if (waypoints.length > 0) {
            const newWaypoints = waypoints.slice(0, -1);
            setWaypoints(newWaypoints);
            fetchRoute(newWaypoints);
        }
    }, [waypoints, fetchRoute]);

    const confirmDelete = useCallback(() => {
        if (pointToDelete !== null) {
            const newWaypoints = waypoints.filter((_, i) => i !== pointToDelete);
            setWaypoints(newWaypoints);
            fetchRoute(newWaypoints);
            setPointToDelete(null);
        }
    }, [pointToDelete, waypoints, fetchRoute]);

    const addShape = (type) => {
        const map = mapRef.current?.getMap();
        if (!map) return;

        const center = map.getCenter();
        const centerPoint = [center.lng, center.lat];

        let geojson;
        const radius = 0.5; // km

        if (type === 'circle') {
            geojson = turf.circle(centerPoint, radius, { steps: 64, units: 'kilometers' });
        } else if (type === 'heart') {
            const points = [];
            const R = radius / 100;
            for (let t = 0; t <= 2 * Math.PI; t += 0.1) {
                const x = 16 * Math.pow(Math.sin(t), 3);
                const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
                const lng = center.lng + (x * R);
                const lat = center.lat + (y * R);
                points.push([lng, lat]);
            }
            points.push(points[0]);
            geojson = turf.polygon([points]);
        }

        if (geojson) {
            const distance = turf.length(geojson, { units: 'kilometers' });
            const coordinates = geojson.geometry.coordinates[0] || geojson.geometry.coordinates;

            // Fetch real elevation data
            fetchElevation(coordinates).then(elevationData => {
                setRouteGeometry(geojson.geometry);
                setWaypoints([]);
                setRunData(prev => ({
                    ...prev,
                    distance: parseFloat(distance.toFixed(2)),
                    route: coordinates,
                    elevationGain: elevationData.elevationGain,
                    elevationProfile: elevationData.elevationProfile
                }));
            });
        }
    };

    return (
        <div
            className="w-full h-full relative"
            onContextMenu={(e) => {
                e.preventDefault();
                return false;
            }}
        >
            <Map
                ref={mapRef}
                mapLib={mapboxgl}
                initialViewState={viewport}
                onMove={(evt) => setViewport(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle={mapStyle}
                mapboxAccessToken={MAPBOX_TOKEN}
                onClick={handleMapClick}
                cursor={draggingIndex !== null ? 'grabbing' : 'crosshair'}
            >
                <GeocoderControl mapboxAccessToken={MAPBOX_TOKEN} position="top-right" mapboxgl={mapboxgl} />
                <GeolocateControl
                    ref={geolocateControlRef}
                    position="top-right"
                    positionOptions={{ enableHighAccuracy: true }}
                    trackUserLocation={true}
                    showUserHeading={true}
                />
                <NavigationControl position="bottom-right" />

                {/* Route Line */}
                {routeGeometry && (
                    <Source id="route" type="geojson" data={{ type: 'Feature', geometry: routeGeometry }}>
                        <Layer
                            id="route-line"
                            type="line"
                            paint={{
                                'line-color': '#fc4c02',
                                'line-width': 4,
                                'line-opacity': 0.9
                            }}
                        />
                    </Source>
                )}

                {/* Waypoint Markers */}
                {waypoints.map((point, index) => (
                    <Marker
                        key={index}
                        longitude={point.lng}
                        latitude={point.lat}
                        draggable={true}
                        onDragStart={() => onMarkerDragStart(index)}
                        onDrag={(e) => onMarkerDrag(e, index)}
                        onDragEnd={(e) => onMarkerDragEnd(e, index)}
                        anchor="center"
                    >
                        <div
                            className="w-4 h-4 bg-white border-[3px] border-[#fc4c02] rounded-full shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                            title={`Point ${index + 1} - Drag to move, Right-click to delete`}
                            onMouseDown={(e) => {
                                if (e.button === 2) { // Right click
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setPointToDelete(index);
                                    setDeleteModalOpen(true);
                                }
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                            }}
                        />
                    </Marker>
                ))}
            </Map>

            {/* Controls */}
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-white/95 backdrop-blur-sm p-1 rounded-lg shadow-md border border-gray-200 flex items-center gap-1">
                    {/* Info / Instructions */}
                    <div className="relative group">
                        <button className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
                            <Info size={18} />
                        </button>
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white text-gray-700 text-xs p-3 rounded-lg shadow-xl border border-gray-100 hidden group-hover:block z-50">
                            <p className="font-bold mb-2 text-gray-900">Route Builder</p>
                            <ul className="space-y-1.5">
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                    Click map to add points
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                    Drag points to adjust
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                    Right-click point to delete
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="w-px h-5 bg-gray-200 mx-0.5" />

                    <button
                        onClick={undoLastPoint}
                        disabled={waypoints.length === 0}
                        className="p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-gray-700 transition-colors"
                        title="Undo Last Point"
                    >
                        <Undo2 size={18} />
                    </button>

                    <button
                        onClick={clearRoute}
                        disabled={waypoints.length === 0}
                        className="p-2 hover:bg-red-50 text-red-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors"
                        title="Clear Route"
                    >
                        <Trash2 size={18} />
                    </button>

                    <div className="w-px h-5 bg-gray-200 mx-0.5" />

                    {/* Map Style */}
                    <div className="relative group">
                        <button className="p-2 hover:bg-gray-100 rounded-md text-gray-700 transition-colors">
                            <MapIcon size={18} />
                        </button>
                        <div className="absolute top-full left-0 mt-2 bg-white p-1.5 rounded-lg shadow-xl border border-gray-100 hidden group-hover:block min-w-[150px] z-50">
                            <div className="text-[10px] font-bold px-2 py-1.5 text-gray-400 uppercase tracking-wider">Map Style</div>
                            {MAP_STYLES.map(style => (
                                <button
                                    key={style.name}
                                    onClick={() => setMapStyle(style.url)}
                                    className={`w-full text-left px-3 py-2 text-xs rounded-md hover:bg-orange-50 hover:text-orange-700 transition-colors ${mapStyle === style.url ? 'bg-orange-50 text-orange-700 font-bold' : 'text-gray-600'}`}
                                >
                                    {style.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Shape Controls - Temporarily hidden
            <div className="absolute top-4 right-12 z-10 flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur p-2 rounded-md shadow-sm border border-border flex flex-col gap-2">
                    <div className="text-xs font-bold text-center mb-1">Shapes</div>
                    <button className="p-2 hover:bg-secondary rounded text-xs border border-border" onClick={() => addShape('circle')}>
                        Circle
                    </button>
                    <button className="p-2 hover:bg-secondary rounded text-xs border border-border" onClick={() => addShape('heart')}>
                        Heart
                    </button>
                </div>
            </div>
            */}

            < ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setPointToDelete(null);
                }
                }
                onConfirm={confirmDelete}
                title="Delete Waypoint"
                message={`Are you sure you want to delete point ${pointToDelete !== null ? pointToDelete + 1 : ''}? This will recalculate the route.`}
                confirmText="Delete"
                isDestructive={true}
            />
        </div >
    );
}
