import { useControl } from 'react-map-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';

export default function GeocoderControl(props) {
    const {
        mapboxAccessToken,
        position = 'top-right',
        onLoading = () => { },
        onResults = () => { },
        onResult = () => { },
        onError = () => { },
        marker = true,
        ...otherProps
    } = props;

    useControl(
        () => {
            const ctrl = new MapboxGeocoder({
                accessToken: mapboxAccessToken,
                marker: marker,
                collapsed: true,
                ...otherProps
            });

            ctrl.on('loading', onLoading);
            ctrl.on('results', onResults);
            ctrl.on('result', (evt) => {
                onResult(evt);
                const { result } = evt;
                const location =
                    result &&
                    (result.center || (result.geometry?.type === 'Point' && result.geometry.coordinates));
                if (location) {
                    // The map will fly to the location automatically by default geocoder behavior
                    // unless flyTo is set to false in otherProps
                }
            });
            ctrl.on('error', onError);
            return ctrl;
        },
        {
            position: position
        }
    );

    return null;
}
