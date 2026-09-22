import { NextRequest, NextResponse } from 'next/server';

// Verified Indian cities and localities with high-precision coordinates for fallback
const FALLBACK_PLACES = [
  {
    placeId: 'fallback_kalyan_west',
    name: 'Kalyan West',
    formattedAddress: 'Kalyan West, Kalyan, Maharashtra 421301, India',
    city: 'Kalyan',
    state: 'Maharashtra',
    lat: 19.2437,
    lng: 73.1355,
  },
  {
    placeId: 'fallback_kalyan_east',
    name: 'Kalyan East',
    formattedAddress: 'Kalyan East, Kalyan, Maharashtra 421306, India',
    city: 'Kalyan',
    state: 'Maharashtra',
    lat: 19.2312,
    lng: 73.1428,
  },
  {
    placeId: 'fallback_kandivali',
    name: 'Kandivali',
    formattedAddress: 'Kandivali West, Mumbai, Maharashtra 400067, India',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.2063,
    lng: 72.8543,
  },
  {
    placeId: 'fallback_kurla',
    name: 'Kurla',
    formattedAddress: 'Kurla, Mumbai, Maharashtra 400070, India',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0688,
    lng: 72.8804,
  },
  {
    placeId: 'fallback_kharghar',
    name: 'Kharghar',
    formattedAddress: 'Kharghar, Navi Mumbai, Maharashtra 410210, India',
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    lat: 19.0473,
    lng: 73.0699,
  },
  {
    placeId: 'fallback_bandra',
    name: 'Bandra West',
    formattedAddress: 'Bandra West, Mumbai, Maharashtra 400050, India',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0596,
    lng: 72.8295,
  },
  {
    placeId: 'fallback_andheri',
    name: 'Andheri West',
    formattedAddress: 'Andheri West, Mumbai, Maharashtra 400058, India',
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.1136,
    lng: 72.8697,
  },
  {
    placeId: 'fallback_thane',
    name: 'Thane',
    formattedAddress: 'Thane, Maharashtra 400601, India',
    city: 'Thane',
    state: 'Maharashtra',
    lat: 19.2183,
    lng: 72.9781,
  },
  {
    placeId: 'fallback_pune',
    name: 'Pune',
    formattedAddress: 'Shivaji Nagar, Pune, Maharashtra 411005, India',
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5204,
    lng: 73.8567,
  },
  {
    placeId: 'fallback_delhi_cp',
    name: 'Connaught Place',
    formattedAddress: 'Connaught Place, New Delhi, Delhi 110001, India',
    city: 'New Delhi',
    state: 'Delhi',
    lat: 28.6315,
    lng: 77.2167,
  },
  {
    placeId: 'fallback_bengaluru_koramangala',
    name: 'Koramangala',
    formattedAddress: 'Koramangala, Bengaluru, Karnataka 560034, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9352,
    lng: 77.6245,
  },
  {
    placeId: 'fallback_bengaluru_indiranagar',
    name: 'Indiranagar',
    formattedAddress: 'Indiranagar, Bengaluru, Karnataka 560038, India',
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9784,
    lng: 77.6408,
  },
  {
    placeId: 'fallback_hyderabad_hitech',
    name: 'HITEC City',
    formattedAddress: 'HITEC City, Hyderabad, Telangana 500081, India',
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.4435,
    lng: 78.3772,
  },
  {
    placeId: 'fallback_chennai_t_nagar',
    name: 'T. Nagar',
    formattedAddress: 'T. Nagar, Chennai, Tamil Nadu 600017, India',
    city: 'Chennai',
    state: 'Tamil Nadu',
    lat: 13.0418,
    lng: 80.2341,
  },
  {
    placeId: 'fallback_kolkata_park_street',
    name: 'Park Street',
    formattedAddress: 'Park Street, Kolkata, West Bengal 700016, India',
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.5535,
    lng: 88.3518,
  },
  {
    placeId: 'fallback_ahmedabad',
    name: 'Navrangpura',
    formattedAddress: 'Navrangpura, Ahmedabad, Gujarat 380009, India',
    city: 'Ahmedabad',
    state: 'Gujarat',
    lat: 23.0365,
    lng: 72.5611,
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'autocomplete';
  const input = searchParams.get('input')?.trim() || '';
  const placeId = searchParams.get('place_id')?.trim() || '';

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  try {
    // 1. PLACE DETAILS REQUEST
    if (action === 'details') {
      if (!placeId) {
        return NextResponse.json({ success: false, error: 'Place ID is required' }, { status: 400 });
      }

      // Check fallback list first if matching id
      const localMatch = FALLBACK_PLACES.find(p => p.placeId === placeId);
      if (localMatch) {
        return NextResponse.json({
          success: true,
          place: {
            placeId: localMatch.placeId,
            name: localMatch.name,
            formattedAddress: localMatch.formattedAddress,
            lat: localMatch.lat,
            lng: localMatch.lng,
          }
        });
      }

      if (apiKey) {
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
      }

      return NextResponse.json({ success: false, error: 'Place not found' }, { status: 404 });
    }

    // 2. AUTOCOMPLETE REQUEST
    if (!input || input.length < 1) {
      return NextResponse.json({ success: true, predictions: [] });
    }

    if (apiKey) {
      try {
        const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:in&language=en&key=${apiKey}`;
        const res = await fetch(autocompleteUrl);
        const data = await res.json();

        if (data.status === 'OK' && Array.isArray(data.predictions) && data.predictions.length > 0) {
          const predictions = data.predictions.map((p: any) => ({
            placeId: p.place_id,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || '',
            description: p.description
          }));
          return NextResponse.json({ success: true, predictions });
        }
      } catch (apiErr) {
        console.warn('Google Places API fetch error, falling back to local dataset:', apiErr);
      }
    }

    // Fallback search across popular Indian cities and localities
    const lowerInput = input.toLowerCase();
    const matches = FALLBACK_PLACES.filter(p =>
      p.name.toLowerCase().includes(lowerInput) ||
      p.city.toLowerCase().includes(lowerInput) ||
      p.formattedAddress.toLowerCase().includes(lowerInput)
    );

    const predictions = matches.map(m => ({
      placeId: m.placeId,
      mainText: m.name,
      secondaryText: `${m.city}, ${m.state}, India`,
      description: m.formattedAddress
    }));

    return NextResponse.json({
      success: true,
      predictions,
      source: apiKey ? 'google' : 'fallback'
    });
  } catch (error: any) {
    console.error('Maps Places API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
