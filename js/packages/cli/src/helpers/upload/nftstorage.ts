import { NFTStorageMetaplexor } from '@nftstorage/metaplex-auth';
import type { Keypair } from '@solana/web3.js';

export async function nftStorageUpload(
  walletKeypair: Keypair,
  clusterEnv: string,
  imagePath: string,
  metadataPath: string,
): Promise<[string, string]> {
  const endpoint = process.env.NFT_STORAGE_ENDPOINT
    ? new URL(process.env.NFT_STORAGE_ENDPOINT)
    : undefined;
  const uploader = NFTStorageMetaplexor.withSecretKey(walletKeypair.secretKey, {
    solanaCluster: clusterEnv,
    endpoint,
  });

  const result = await uploader.storeNFTFromFilesystem(metadataPath, imagePath);
  return [result.metadataGatewayURL, result.metadata['image']];
}
