export const runtime = "nodejs";

export async function POST(request) {
  try {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "PINATA_JWT not configured" }),
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return new Response(JSON.stringify({ error: "File is required" }), {
        status: 400,
      });
    }

    const pinataForm = new FormData();
    pinataForm.append("file", file, file.name);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: pinataForm,
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(
        JSON.stringify({ error: "Pinata upload failed", detail: text }),
        { status: 500 },
      );
    }

    const data = await res.json();
    const cid = data.IpfsHash;
    const ipfs = `ipfs://${cid}`;
    const gateway = `https://gateway.pinata.cloud/ipfs/${cid}`;

    return new Response(
      JSON.stringify({ cid, ipfs, gateway }),
      { status: 200 },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Upload failed", detail: error?.message || String(error) }),
      { status: 500 },
    );
  }
}
