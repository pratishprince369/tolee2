import { NextRequest, NextResponse } from 'next/server';

// Verified global and Indian locations with exact coordinates for instantaneous zero-latency response
const CURATED_WORLD_LOCATIONS = [
  // India - Top Metros & Districts
  { placeId: 'loc_mumbai', name: 'Mumbai', formattedAddress: 'Mumbai, Maharashtra, India', city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0760, lng: 72.8777 },
  { placeId: 'loc_kalyan_west', name: 'Kalyan West', formattedAddress: 'Kalyan West, Kalyan, Maharashtra 421301, India', city: 'Kalyan', state: 'Maharashtra', country: 'India', lat: 19.2437, lng: 73.1355 },
  { placeId: 'loc_kalyan_east', name: 'Kalyan East', formattedAddress: 'Kalyan East, Kalyan, Maharashtra 421306, India', city: 'Kalyan', state: 'Maharashtra', country: 'India', lat: 19.2312, lng: 73.1428 },
  { placeId: 'loc_kandivali', name: 'Kandivali', formattedAddress: 'Kandivali West, Mumbai, Maharashtra 400067, India', city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.2063, lng: 72.8543 },
  { placeId: 'loc_kurla', name: 'Kurla', formattedAddress: 'Kurla, Mumbai, Maharashtra 400070, India', city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0688, lng: 72.8804 },
  { placeId: 'loc_kharghar', name: 'Kharghar', formattedAddress: 'Kharghar, Navi Mumbai, Maharashtra 410210, India', city: 'Navi Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0473, lng: 73.0699 },
  { placeId: 'loc_thane', name: 'Thane', formattedAddress: 'Thane, Maharashtra 400601, India', city: 'Thane', state: 'Maharashtra', country: 'India', lat: 19.2183, lng: 72.9781 },
  { placeId: 'loc_navi_mumbai', name: 'Navi Mumbai', formattedAddress: 'Navi Mumbai, Maharashtra, India', city: 'Navi Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0330, lng: 73.0297 },
  { placeId: 'loc_bandra', name: 'Bandra West', formattedAddress: 'Bandra West, Mumbai, Maharashtra 400050, India', city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.0596, lng: 72.8295 },
  { placeId: 'loc_andheri', name: 'Andheri West', formattedAddress: 'Andheri West, Mumbai, Maharashtra 400058, India', city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.1136, lng: 72.8697 },
  { placeId: 'loc_borivali', name: 'Borivali', formattedAddress: 'Borivali West, Mumbai, Maharashtra, India', city: 'Mumbai', state: 'Maharashtra', country: 'India', lat: 19.2307, lng: 72.8567 },
  { placeId: 'loc_dombivli', name: 'Dombivli', formattedAddress: 'Dombivli East, Thane, Maharashtra, India', city: 'Dombivli', state: 'Maharashtra', country: 'India', lat: 19.2184, lng: 73.0867 },
  { placeId: 'loc_pune', name: 'Pune', formattedAddress: 'Pune, Maharashtra, India', city: 'Pune', state: 'Maharashtra', country: 'India', lat: 18.5204, lng: 73.8567 },
  { placeId: 'loc_delhi', name: 'New Delhi', formattedAddress: 'New Delhi, Delhi 110001, India', city: 'New Delhi', state: 'Delhi', country: 'India', lat: 28.6139, lng: 77.2090 },
  { placeId: 'loc_bengaluru', name: 'Bengaluru', formattedAddress: 'Bengaluru, Karnataka, India', city: 'Bengaluru', state: 'Karnataka', country: 'India', lat: 12.9716, lng: 77.5946 },
  { placeId: 'loc_hyderabad', name: 'Hyderabad', formattedAddress: 'Hyderabad, Telangana, India', city: 'Hyderabad', state: 'Telangana', country: 'India', lat: 17.3850, lng: 78.4867 },
  { placeId: 'loc_chennai', name: 'Chennai', formattedAddress: 'Chennai, Tamil Nadu, India', city: 'Chennai', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lng: 80.2707 },
  { placeId: 'loc_kolkata', name: 'Kolkata', formattedAddress: 'Kolkata, West Bengal, India', city: 'Kolkata', state: 'West Bengal', country: 'India', lat: 22.5726, lng: 88.3639 },
  { placeId: 'loc_ahmedabad', name: 'Ahmedabad', formattedAddress: 'Ahmedabad, Gujarat, India', city: 'Ahmedabad', state: 'Gujarat', country: 'India', lat: 23.0225, lng: 72.5714 },
  { placeId: 'loc_jaipur', name: 'Jaipur', formattedAddress: 'Jaipur, Rajasthan, India', city: 'Jaipur', state: 'Rajasthan', country: 'India', lat: 26.9124, lng: 75.7873 },
  { placeId: 'loc_surat', name: 'Surat', formattedAddress: 'Surat, Gujarat, India', city: 'Surat', state: 'Gujarat', country: 'India', lat: 21.1702, lng: 72.8311 },
  { placeId: 'loc_lucknow', name: 'Lucknow', formattedAddress: 'Lucknow, Uttar Pradesh, India', city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', lat: 26.8467, lng: 80.9462 },
  { placeId: 'loc_indore', name: 'Indore', formattedAddress: 'Indore, Madhya Pradesh, India', city: 'Indore', state: 'Madhya Pradesh', country: 'India', lat: 22.7196, lng: 75.8577 },
  { placeId: 'loc_chandigarh', name: 'Chandigarh', formattedAddress: 'Chandigarh, India', city: 'Chandigarh', state: 'Punjab', country: 'India', lat: 30.7333, lng: 76.7794 },
  { placeId: 'loc_nagpur', name: 'Nagpur', formattedAddress: 'Nagpur, Maharashtra, India', city: 'Nagpur', state: 'Maharashtra', country: 'India', lat: 21.1458, lng: 79.0882 },
  { placeId: 'loc_nashik', name: 'Nashik', formattedAddress: 'Nashik, Maharashtra, India', city: 'Nashik', state: 'Maharashtra', country: 'India', lat: 19.9975, lng: 73.7898 },
  { placeId: 'loc_noida', name: 'Noida', formattedAddress: 'Noida, Uttar Pradesh, India', city: 'Noida', state: 'Uttar Pradesh', country: 'India', lat: 28.5355, lng: 77.3910 },
  { placeId: 'loc_gurgaon', name: 'Gurgaon', formattedAddress: 'Gurgaon, Haryana, India', city: 'Gurgaon', state: 'Haryana', country: 'India', lat: 28.4595, lng: 77.0266 },

  // International - Major World Cities
  { placeId: 'loc_dubai', name: 'Dubai', formattedAddress: 'Dubai, United Arab Emirates', city: 'Dubai', state: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { placeId: 'loc_abu_dhabi', name: 'Abu Dhabi', formattedAddress: 'Abu Dhabi, United Arab Emirates', city: 'Abu Dhabi', state: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4539, lng: 54.3773 },
  { placeId: 'loc_london', name: 'London', formattedAddress: 'London, United Kingdom', city: 'London', state: 'England', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { placeId: 'loc_new_york', name: 'New York', formattedAddress: 'New York, NY, United States', city: 'New York', state: 'NY', country: 'United States', lat: 40.7128, lng: -74.0060 },
  { placeId: 'loc_san_francisco', name: 'San Francisco', formattedAddress: 'San Francisco, CA, United States', city: 'San Francisco', state: 'CA', country: 'United States', lat: 37.7749, lng: -122.4194 },
  { placeId: 'loc_toronto', name: 'Toronto', formattedAddress: 'Toronto, ON, Canada', city: 'Toronto', state: 'ON', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { placeId: 'loc_singapore', name: 'Singapore', formattedAddress: 'Singapore', city: 'Singapore', state: 'Central', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { placeId: 'loc_tokyo', name: 'Tokyo', formattedAddress: 'Tokyo, Japan', city: 'Tokyo', state: 'Kanto', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { placeId: 'loc_sydney', name: 'Sydney', formattedAddress: 'Sydney, NSW, Australia', city: 'Sydney', state: 'NSW', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { placeId: 'loc_paris', name: 'Paris', formattedAddress: 'Paris, France', city: 'Paris', state: 'Ile-de-France', country: 'France', lat: 48.8566, lng: 2.3522 },
  { placeId: 'loc_berlin', name: 'Berlin', formattedAddress: 'Berlin, Germany', city: 'Berlin', state: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
  { placeId: 'loc_riyadh', name: 'Riyadh', formattedAddress: 'Riyadh, Saudi Arabia', city: 'Riyadh', state: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753 }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'autocomplete';
  const input = searchParams.get('input')?.trim() || '';
  const placeId = searchParams.get('place_id')?.trim() || '';

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  try {
    // ==========================================
    // 1. PLACE DETAILS REQUEST
    // ==========================================
    if (action === 'details') {
      if (!placeId) {
        return NextResponse.json({ success: false, error: 'Place ID is required' }, { status: 400 });
      }

      // 1A. Check curated list
      const curatedMatch = CURATED_WORLD_LOCATIONS.find(p => p.placeId === placeId);
      if (curatedMatch) {
        return NextResponse.json({
          success: true,
          place: {
            placeId: curatedMatch.placeId,
            name: curatedMatch.name,
            formattedAddress: curatedMatch.formattedAddress,
            lat: curatedMatch.lat,
            lng: curatedMatch.lng,
          }
        });
      }

      // 1B. Check if it's an OSM Nominatim encoded place ID: osm_{lat}_{lng}
      if (placeId.startsWith('osm_')) {
        const parts = placeId.split('_');
        if (parts.length >= 3) {
          const lat = parseFloat(parts[1]);
          const lng = parseFloat(parts[2]);
          return NextResponse.json({
            success: true,
            place: {
              placeId,
              name: searchParams.get('name') || 'Selected Location',
              formattedAddress: searchParams.get('address') || `${lat}, ${lng}`,
              lat,
              lng
            }
          });
        }
      }

      // 1C. Check Google Places API if key configured
      if (apiKey) {
        try {
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=place_id,name,formatted_address,geometry&key=${apiKey}`;
          const res = await fetch(detailsUrl);
          const data = await res.json();

          if (data.status === 'OK' && data.result) {
            const resPlace = data.result;
            return NextResponse.json({
              success: true,
              place: {
                placeId: resPlace.place_id,
                name: resPlace.name,
                formattedAddress: resPlace.formatted_address,
                lat: resPlace.geometry?.location?.lat,
                lng: resPlace.geometry?.location?.lng,
              }
            });
          }
        } catch (apiErr) {
          console.warn('Google Places details error:', apiErr);
        }
      }

      return NextResponse.json({ success: false, error: 'Place not found' }, { status: 404 });
    }

    // ==========================================
    // 2. AUTOCOMPLETE REQUEST (WORLDWIDE)
    // ==========================================
    if (!input || input.length < 1) {
      return NextResponse.json({ success: true, predictions: [] });
    }

    const lowerInput = input.toLowerCase();
    const results: any[] = [];
    const seenPlaceIds = new Set<string>();

    // 2A. Instant match against Curated Worldwide Locations (Zero-latency)
    const curatedMatches = CURATED_WORLD_LOCATIONS.filter(p =>
      p.name.toLowerCase().startsWith(lowerInput) ||
      p.city.toLowerCase().startsWith(lowerInput) ||
      p.name.toLowerCase().includes(lowerInput) ||
      p.city.toLowerCase().includes(lowerInput) ||
      p.formattedAddress.toLowerCase().includes(lowerInput)
    );

    for (const m of curatedMatches) {
      if (!seenPlaceIds.has(m.placeId)) {
        seenPlaceIds.add(m.placeId);
        results.push({
          placeId: m.placeId,
          mainText: m.name,
          secondaryText: m.formattedAddress,
          description: m.formattedAddress,
          lat: m.lat,
          lng: m.lng
        });
      }
    }

    // 2B. Query Google Places API if key exists
    if (apiKey) {
      try {
        const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&language=en&key=${apiKey}`;
        const res = await fetch(autocompleteUrl);
        const data = await res.json();

        if (data.status === 'OK' && Array.isArray(data.predictions)) {
          for (const p of data.predictions) {
            if (!seenPlaceIds.has(p.place_id)) {
              seenPlaceIds.add(p.place_id);
              results.push({
                placeId: p.place_id,
                mainText: p.structured_formatting?.main_text || p.description,
                secondaryText: p.structured_formatting?.secondary_text || '',
                description: p.description
              });
            }
          }
        }
      } catch (googleErr) {
        console.warn('Google Places API call error:', googleErr);
      }
    }

    // 2C. Query Nominatim Worldwide OpenStreetMap Geocoding (All locations of the world)
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&addressdetails=1&limit=8`;
      const osmRes = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'ToleeSocialApp/1.0 (https://tolee.in)'
        }
      });

      if (osmRes.ok) {
        const osmData = await osmRes.json();
        if (Array.isArray(osmData)) {
          for (const item of osmData) {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            const placeId = `osm_${lat.toFixed(5)}_${lng.toFixed(5)}`;

            if (!seenPlaceIds.has(placeId)) {
              seenPlaceIds.add(placeId);
              const addr = item.address || {};
              const mainText = addr.city || addr.town || addr.village || addr.suburb || addr.state || item.display_name.split(',')[0];
              results.push({
                placeId,
                mainText,
                secondaryText: item.display_name,
                description: item.display_name,
                lat,
                lng
              });
            }
          }
        }
      }
    } catch (osmErr) {
      console.warn('Nominatim worldwide search error:', osmErr);
    }

    return NextResponse.json({
      success: true,
      predictions: results.slice(0, 10),
      count: results.length
    });
  } catch (error: any) {
    console.error('Maps Places API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
