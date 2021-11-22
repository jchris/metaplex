import {
  MetaplexAuthWithSecretKey,
  NFTStorageUploader,
} from 'metaplex-dotstorage-auth';
import { File } from '@web-std/file';
import { getFilesFromPath } from 'files-from-path';
import type { Keypair } from '@solana/web3.js';

const GATEWAY_HOST = 'https://dweb.link';

export async function nftStorageUpload(
  walletKeypair: Keypair,
  clusterEnv: string,
  image: string,
  metadata: Record<string, any>,
): Promise<[string, string]> {
  const auth = MetaplexAuthWithSecretKey(walletKeypair.secretKey, clusterEnv);
  const files = await getFilesFromPath(image);

  const imageFile = files.find(f => f.name.endsWith('.png'));
  if (imageFile == null) {
    throw new Error('unable to find image file from input path: ' + image);
  }

  const uploader = new NFTStorageUploader(
    auth,
    process.env.NFT_STORAGE_ENDPOINT || undefined,
  );
  const imageName = metadata.image;
  // @ts-ignore
  const res = await uploader.uploadFiles(files);
  const imageURL = gatewayURL(res.rootCID, imageFile.name);

  metadata.image = imageURL;
  if (metadata.properties && metadata.properties.files) {
    metadata.properties.files = metadata.properties.files.map(f => {
      // try to return a gateway link to each file in the properties array
      // if we've uploaded a file with the same name.
      if (f.uri) {
        const filename = f.uri.split('/').pop();

        // if uri is equal to the original value of 'image' field,
        // use the image gateway URL
        if (filename === imageName) {
          return { ...f, uri: imageURL };
        }

        // if the uri matches the name of an uploaded file,
        // replace with a gateway url to the file
        const uploaded = files.find(
          file => stripLeadingSlash(file.name) === filename,
        );
        if (uploaded) {
          return { ...f, uri: gatewayURL(res.rootCID, filename) };
        }
      }

      // if the uri doesn't match an uploaded file, return unchanged
      return f;
    });
  }

  const manifestFile = new File([JSON.stringify(metadata)], 'metadata.json');
  const manifestRes = await uploader.uploadFiles([manifestFile]);
  const manifestGatewayURL = gatewayURL(manifestRes.rootCID, 'metadata.json');

  return [manifestGatewayURL, imageURL];
}

function stripLeadingSlash(s: string): string {
  return s.replace(new RegExp('^\\/'), '');
}
function gatewayURL(cid: string, filename: string): string {
  cid = stripLeadingSlash(cid);
  filename = stripLeadingSlash(filename);
  return new URL(`/ipfs/${cid}/${filename}`, GATEWAY_HOST).toString();
}
