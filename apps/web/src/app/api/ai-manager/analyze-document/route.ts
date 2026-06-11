import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { apiRateLimiter } from '@/lib/rate-limit';

interface DetectedElement {
  label: string;
  confidence: number;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (apiRateLimiter.isRateLimited(userId)) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // 2. Parse Request Body
    const { image } = await request.json();
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ success: false, error: 'A base64 encoded image string is required.' }, { status: 400 });
    }

    const apiKey = process.env.NVIDIA_PAGE_ELEMENTS_KEY || process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'NVIDIA Page Elements API Key not configured on server.' }, { status: 500 });
    }

    // Format image base64 correctly (NVIDIA requires prefix data:image/...;base64,)
    let formattedBase64 = image;
    if (!image.startsWith('data:')) {
      // Guess type is png/jpeg
      formattedBase64 = `data:image/jpeg;base64,${image}`;
    }

    // 3. Define alternative request schemas for maximum compatibility with NIM instances
    const payloads = [
      // Format 1: Multi-modal NIM input payload (Standard format)
      {
        input: [
          {
            type: "image_url",
            url: formattedBase64
          }
        ]
      },
      // Format 2: Single-image NIM payload structure
      {
        input: {
          image: formattedBase64
        }
      },
      // Format 3: Flat image schema
      {
        image: formattedBase64
      }
    ];

    let lastErrorMsg = 'Failed to analyze page elements.';
    let rawResponseText = '';
    let successResponseJson: any = null;

    // Retry alternative payload structures if one fails with a 400 Bad Request
    for (let i = 0; i < payloads.length; i++) {
      try {
        const response = await fetch('https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-page-elements-v3', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payloads[i]),
          // Enforce a sensible timeout
          signal: AbortSignal.timeout(15000)
        });

        rawResponseText = await response.text();

        if (response.ok) {
          successResponseJson = JSON.parse(rawResponseText);
          break; // Found working payload layout
        } else {
          console.warn(`Nemotron Page Elements API variant ${i} failed with status: ${response.status}. Response: ${rawResponseText}`);
          lastErrorMsg = `NVIDIA API Error (${response.status}): ${rawResponseText || response.statusText}`;
        }
      } catch (fetchErr: any) {
        console.error(`Fetch attempt ${i} failed:`, fetchErr);
        lastErrorMsg = fetchErr.message || String(fetchErr);
      }
    }

    if (!successResponseJson) {
      return NextResponse.json({ success: false, error: lastErrorMsg }, { status: 502 });
    }

    // 4. Parse layout elements into standardized interface
    const elements: DetectedElement[] = [];

    // Parse format 1: data[0].bounding_boxes: { title: [...], table: [...] }
    if (successResponseJson.data && Array.isArray(successResponseJson.data)) {
      const pageData = successResponseJson.data[0];
      if (pageData && pageData.bounding_boxes) {
        const boxes = pageData.bounding_boxes;
        for (const [label, list] of Object.entries(boxes)) {
          if (Array.isArray(list)) {
            for (const item of list) {
              elements.push({
                label,
                confidence: typeof item.confidence === 'number' ? item.confidence : 1.0,
                x_min: item.x_min !== undefined ? item.x_min : item.x0 !== undefined ? item.x0 : 0,
                y_min: item.y_min !== undefined ? item.y_min : item.y0 !== undefined ? item.y0 : 0,
                x_max: item.x_max !== undefined ? item.x_max : item.x1 !== undefined ? item.x1 : 1,
                y_max: item.y_max !== undefined ? item.y_max : item.y1 !== undefined ? item.y1 : 1,
              });
            }
          }
        }
      }
    }
    // Parse format 2: detections: [ { label, confidence, box_2d: [ymin, xmin, ymax, xmax] } ]
    else if (successResponseJson.detections && Array.isArray(successResponseJson.detections)) {
      for (const d of successResponseJson.detections) {
        const box = d.box_2d || d.bbox || d.bounding_box || [];
        elements.push({
          label: d.label || d.class || 'element',
          confidence: d.confidence || d.score || 1.0,
          // Handle box array mapping (typically ymin, xmin, ymax, xmax in some detectors or xmin, ymin, xmax, ymax)
          // YOLOX normalized box output usually uses [ymin, xmin, ymax, xmax] or standard coordinate pairs.
          y_min: box[0] !== undefined ? box[0] : 0,
          x_min: box[1] !== undefined ? box[1] : 0,
          y_max: box[2] !== undefined ? box[2] : 1,
          x_max: box[3] !== undefined ? box[3] : 1,
        });
      }
    }
    // Parse format 3: bounding_boxes at root level
    else if (successResponseJson.bounding_boxes) {
      const boxes = successResponseJson.bounding_boxes;
      for (const [label, list] of Object.entries(boxes)) {
        if (Array.isArray(list)) {
          for (const item of list) {
            elements.push({
              label,
              confidence: typeof item.confidence === 'number' ? item.confidence : 1.0,
              x_min: item.x_min !== undefined ? item.x_min : item.x0 !== undefined ? item.x0 : 0,
              y_min: item.y_min !== undefined ? item.y_min : item.y0 !== undefined ? item.y0 : 0,
              x_max: item.x_max !== undefined ? item.x_max : item.x1 !== undefined ? item.x1 : 1,
              y_max: item.y_max !== undefined ? item.y_max : item.y1 !== undefined ? item.y1 : 1,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      elements
    });

  } catch (error: any) {
    console.error('API Error in /api/ai-manager/analyze-document:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
