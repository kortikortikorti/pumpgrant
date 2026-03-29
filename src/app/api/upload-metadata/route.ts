import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/upload-metadata
 *
 * Uploads token metadata to pump.fun's IPFS endpoint.
 * Accepts multipart form data with:
 * - name: string
 * - symbol: string
 * - description: string
 * - file: File (image file) OR
 * - image_url: string (direct image URL)
 *
 * Returns: { metadataUri: string }
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let name: string;
    let symbol: string;
    let description: string;
    let imageFile: File | null = null;
    let imageUrl: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      name = formData.get('name') as string || '';
      symbol = formData.get('symbol') as string || '';
      description = formData.get('description') as string || '';
      imageFile = formData.get('file') as File | null;
      imageUrl = formData.get('image_url') as string | null;
    } else {
      const body = await request.json();
      name = body.name || '';
      symbol = body.symbol || '';
      description = body.description || '';
      imageUrl = body.image_url || null;
    }

    if (!name || !symbol) {
      return NextResponse.json({ error: 'name and symbol are required' }, { status: 400 });
    }

    // Try pump.fun IPFS upload first
    try {
      const pumpFormData = new FormData();
      
      if (imageFile) {
        pumpFormData.append('file', imageFile);
      } else if (imageUrl) {
        // Fetch the image and create a File from it
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const ext = imageUrl.split('.').pop()?.split('?')[0] || 'png';
          const imageFileFromUrl = new File([imageBlob], `token-image.${ext}`, { type: imageBlob.type || 'image/png' });
          pumpFormData.append('file', imageFileFromUrl);
        }
      }
      
      pumpFormData.append('name', name);
      pumpFormData.append('symbol', symbol);
      pumpFormData.append('description', description || '');
      pumpFormData.append('showName', 'true');

      const pumpRes = await fetch('https://pump.fun/api/ipfs', {
        method: 'POST',
        body: pumpFormData,
      });

      if (pumpRes.ok) {
        const pumpData = await pumpRes.json();
        // pump.fun returns { metadataUri: "https://..." }
        const metadataUri = pumpData.metadataUri || pumpData.metadata_uri || pumpData.uri;
        if (metadataUri) {
          console.log('[upload-metadata] Uploaded to pump.fun IPFS:', metadataUri);
          return NextResponse.json({ metadataUri });
        }
      }
      
      console.log('[upload-metadata] pump.fun IPFS upload failed, falling back to self-hosted metadata');
    } catch (pumpErr) {
      console.log('[upload-metadata] pump.fun IPFS not available, using fallback:', pumpErr);
    }

    // Fallback: Create metadata JSON with image URL or data URI
    let imageValue = '';
    if (imageUrl) {
      imageValue = imageUrl;
    } else if (imageFile) {
      // Convert to base64 data URI
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const mimeType = imageFile.type || 'image/png';
      imageValue = `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    const metadata = {
      name,
      symbol,
      description: description || '',
      image: imageValue,
      showName: true,
      createdOn: 'https://pump.fun',
    };

    // Encode as data URI (works as a metadata URI for testing)
    const metadataJson = JSON.stringify(metadata);
    const metadataBase64 = Buffer.from(metadataJson).toString('base64');
    const metadataUri = `data:application/json;base64,${metadataBase64}`;

    console.log('[upload-metadata] Using data URI fallback, length:', metadataUri.length);
    
    // pump.fun has a URI length limit. If too long, strip the image
    if (metadataUri.length > 200) {
      // Use just the image URL without embedding
      const lightMetadata = {
        name,
        symbol,
        description: description || '',
        image: imageUrl || '',
        showName: true,
        createdOn: 'https://pump.fun',
      };
      const lightJson = JSON.stringify(lightMetadata);
      const lightBase64 = Buffer.from(lightJson).toString('base64');
      const lightUri = `data:application/json;base64,${lightBase64}`;
      
      return NextResponse.json({ metadataUri: lightUri });
    }

    return NextResponse.json({ metadataUri });
  } catch (err: any) {
    console.error('[upload-metadata] Error:', err);
    return NextResponse.json(
      { error: `Failed to upload metadata: ${err.message || err}` },
      { status: 500 },
    );
  }
}
