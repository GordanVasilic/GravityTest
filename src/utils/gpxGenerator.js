import { addSeconds, format } from 'date-fns';

export function generateGPX(runData) {
  const { name, date, startTime, distance, time, route, inconsistency, heartRate, elevationGain } = runData;

  // Start time
  const startDateTime = new Date(`${date}T${startTime}:00`);

  // Header
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FakeMy.Run Clone" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <name>${name}</name>
    <time>${startDateTime.toISOString()}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
`;


  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper function to interpolate points between two coordinates
  const interpolatePoints = (lat1, lon1, lat2, lon2, numPoints) => {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      points.push({
        lat: lat1 + (lat2 - lat1) * fraction,
        lon: lon1 + (lon2 - lon1) * fraction
      });
    }
    return points;
  };

  // Determine points
  let points = [];
  if (route && route.length > 0) {
    // Interpolate route points to have one point every ~10 meters
    const targetPointSpacing = 10; // meters

    for (let i = 0; i < route.length - 1; i++) {
      const lat1 = route[i][1];
      const lon1 = route[i][0];
      const lat2 = route[i + 1][1];
      const lon2 = route[i + 1][0];

      const segmentDistance = calculateDistance(lat1, lon1, lat2, lon2);
      const numInterpolatedPoints = Math.max(1, Math.floor(segmentDistance / targetPointSpacing));

      const interpolated = interpolatePoints(lat1, lon1, lat2, lon2, numInterpolatedPoints);

      // Add all points except the last one (to avoid duplicates)
      if (i === route.length - 2) {
        points.push(...interpolated); // Include last point for final segment
      } else {
        points.push(...interpolated.slice(0, -1));
      }
    }
  } else {
    // Simulate circle if no route
    const numPoints = 100;
    const radius = distance / (2 * Math.PI);
    const centerLat = 40.7128;
    const centerLon = -74.0060;
    const R = 6371;

    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const angle = fraction * 2 * Math.PI;
      const dLat = (radius / R) * (180 / Math.PI) * Math.cos(angle);
      const dLon = (radius / R) * (180 / Math.PI) * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
      points.push({ lat: centerLat + dLat, lon: centerLon + dLon });
    }
  }

  // Calculate timestamps with noise (inconsistency)
  const totalPoints = points.length;
  const avgTimePerPoint = time / Math.max(1, totalPoints - 1);
  let currentTime = startDateTime;

  // Elevation simulation
  const baseElevation = 10.0;
  const elevationProfile = [];

  if (elevationGain > 0) {
    // Generate realistic elevation profile with hills
    for (let i = 0; i < totalPoints; i++) {
      const progress = i / totalPoints;
      // Create hills using sine waves
      const hillPattern = Math.sin(progress * Math.PI * 4) * (elevationGain / 4);
      const overallClimb = (Math.sin(progress * Math.PI - Math.PI / 2) + 1) * (elevationGain / 2);
      const noise = (Math.random() - 0.5) * 5;
      elevationProfile.push(baseElevation + overallClimb + hillPattern + noise);
    }
  } else {
    // Flat with minor noise
    for (let i = 0; i < totalPoints; i++) {
      elevationProfile.push(baseElevation + (Math.random() - 0.5) * 2);
    }
  }

  points.forEach((point, i) => {
    // Calculate time increment with noise
    let timeIncrement = avgTimePerPoint;

    if (i > 0 && inconsistency > 0) {
      const factor = 1 + ((Math.random() - 0.5) * 2 * (inconsistency / 50));
      timeIncrement *= factor;
    }

    // Heart Rate Simulation
    let hrXml = '';
    if (heartRate && heartRate.enabled) {
      const progress = i / totalPoints;
      const baseHr = heartRate.min + (heartRate.max - heartRate.min) * (0.5 - 0.5 * Math.cos(progress * Math.PI * 2));
      const noise = (Math.random() - 0.5) * 5;
      const currentHr = Math.round(Math.max(heartRate.min, Math.min(heartRate.max, baseHr + noise)));

      hrXml = `
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>${currentHr}</gpxtpx:hr>
          </gpxtpx:TrackPointExtension>
        </extensions>`;
    }

    const elevation = elevationProfile[i].toFixed(1);

    gpx += `      <trkpt lat="${point.lat.toFixed(6)}" lon="${point.lon.toFixed(6)}">
        <ele>${elevation}</ele>
        <time>${currentTime.toISOString()}</time>${hrXml}
      </trkpt>
`;
    currentTime = addSeconds(currentTime, timeIncrement);
  });

  gpx += `    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

export function generateTCX(runData) {
  const { name, date, startTime, distance, time, route, inconsistency, heartRate, elevationGain, type } = runData;

  const startDateTime = new Date(`${date}T${startTime}:00`);

  // Determine sport type
  const sportMap = { run: 'Running', ride: 'Biking', hike: 'Other' };
  const sport = sportMap[type] || 'Running';

  let tcx = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="${sport}">
      <Id>${startDateTime.toISOString()}</Id>
      <Lap StartTime="${startDateTime.toISOString()}">
        <TotalTimeSeconds>${time}</TotalTimeSeconds>
        <DistanceMeters>${distance * 1000}</DistanceMeters>
        <Calories>0</Calories>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
`;

  // Helper functions (same as GPX)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const interpolatePoints = (lat1, lon1, lat2, lon2, numPoints) => {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      points.push({
        lat: lat1 + (lat2 - lat1) * fraction,
        lon: lon1 + (lon2 - lon1) * fraction
      });
    }
    return points;
  };

  // Determine points (same logic as GPX)
  let points = [];
  if (route && route.length > 0) {
    // Interpolate route points to have one point every ~10 meters
    const targetPointSpacing = 10;

    for (let i = 0; i < route.length - 1; i++) {
      const lat1 = route[i][1];
      const lon1 = route[i][0];
      const lat2 = route[i + 1][1];
      const lon2 = route[i + 1][0];

      const segmentDistance = calculateDistance(lat1, lon1, lat2, lon2);
      const numInterpolatedPoints = Math.max(1, Math.floor(segmentDistance / targetPointSpacing));

      const interpolated = interpolatePoints(lat1, lon1, lat2, lon2, numInterpolatedPoints);

      if (i === route.length - 2) {
        points.push(...interpolated);
      } else {
        points.push(...interpolated.slice(0, -1));
      }
    }
  } else {
    const numPoints = 100;
    const radius = distance / (2 * Math.PI);
    const centerLat = 40.7128;
    const centerLon = -74.0060;
    const R = 6371;

    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const angle = fraction * 2 * Math.PI;
      const dLat = (radius / R) * (180 / Math.PI) * Math.cos(angle);
      const dLon = (radius / R) * (180 / Math.PI) * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180);
      points.push({ lat: centerLat + dLat, lon: centerLon + dLon });
    }
  }

  const totalPoints = points.length;
  const avgTimePerPoint = time / Math.max(1, totalPoints - 1);
  let currentTime = startDateTime;
  let cumulativeDistance = 0;

  // Elevation simulation (same as GPX)
  const baseElevation = 10.0;
  const elevationProfile = [];

  if (elevationGain > 0) {
    for (let i = 0; i < totalPoints; i++) {
      const progress = i / totalPoints;
      const hillPattern = Math.sin(progress * Math.PI * 4) * (elevationGain / 4);
      const overallClimb = (Math.sin(progress * Math.PI - Math.PI / 2) + 1) * (elevationGain / 2);
      const noise = (Math.random() - 0.5) * 5;
      elevationProfile.push(baseElevation + overallClimb + hillPattern + noise);
    }
  } else {
    for (let i = 0; i < totalPoints; i++) {
      elevationProfile.push(baseElevation + (Math.random() - 0.5) * 2);
    }
  }

  points.forEach((point, i) => {
    let timeIncrement = avgTimePerPoint;

    if (i > 0 && inconsistency > 0) {
      const factor = 1 + ((Math.random() - 0.5) * 2 * (inconsistency / 50));
      timeIncrement *= factor;
    }

    cumulativeDistance += (distance * 1000) / totalPoints;

    let hrXml = '';
    if (heartRate && heartRate.enabled) {
      const progress = i / totalPoints;
      const baseHr = heartRate.min + (heartRate.max - heartRate.min) * (0.5 - 0.5 * Math.cos(progress * Math.PI * 2));
      const noise = (Math.random() - 0.5) * 5;
      const currentHr = Math.round(Math.max(heartRate.min, Math.min(heartRate.max, baseHr + noise)));
      hrXml = `
            <HeartRateBpm>
              <Value>${currentHr}</Value>
            </HeartRateBpm>`;
    }

    const elevation = elevationProfile[i].toFixed(1);

    tcx += `          <Trackpoint>
            <Time>${currentTime.toISOString()}</Time>
            <Position>
              <LatitudeDegrees>${point.lat.toFixed(6)}</LatitudeDegrees>
              <LongitudeDegrees>${point.lon.toFixed(6)}</LongitudeDegrees>
            </Position>
            <AltitudeMeters>${elevation}</AltitudeMeters>
            <DistanceMeters>${cumulativeDistance.toFixed(2)}</DistanceMeters>${hrXml}
          </Trackpoint>
`;
    currentTime = addSeconds(currentTime, timeIncrement);
  });

  tcx += `        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

  return tcx;
}

export function downloadGPX(runData) {
  const gpxContent = generateGPX(runData);
  const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${runData.name.replace(/\s+/g, '_')}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadTCX(runData) {
  const tcxContent = generateTCX(runData);
  const blob = new Blob([tcxContent], { type: 'application/vnd.garmin.tcx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${runData.name.replace(/\s+/g, '_')}.tcx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
