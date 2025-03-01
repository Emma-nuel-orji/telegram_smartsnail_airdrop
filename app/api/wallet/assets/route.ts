import { NextResponse } from 'next/server';
import { TonClient } from 'ton'; // TON Blockchain SDK
import { InfuraProvider } from 'ethers';
import { ethers } from 'ethers';
import { Address } from '@ton/core';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Metaplex } from '@metaplex-foundation/js';
import { Connection, PublicKey } from '@solana/web3.js'; // Solana SDK
import 'dotenv/config';

interface CovalentResponse {
  data: {
    items: {
      contract_name: string;
      balance: string | number;
      contract_decimals: number;
    }[];
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const blockchain = searchParams.get('blockchain');

  if (!address || !blockchain) {
    return NextResponse.json(
      { error: 'Wallet address and blockchain are required' },
      { status: 400 }
    );
  }

  try {
    let assets: any[] = [];

    switch (blockchain) {
      case 'TON':
        try {
          const tonClient = new TonClient({ endpoint: 'https://tonapi.io/jsonRPC' });
          const tonBalance = await tonClient.getBalance(Address.parse(address));
          assets.push({ type: 'token', name: 'TON', balance: tonBalance.toString() });
        } catch (error) {
          console.error('❌ TON Error:', error);
        }
        break;

      case 'Ethereum':
        try {
          if (!process.env.INFURA_PROJECT_ID) {
            throw new Error('Missing INFURA_PROJECT_ID in .env');
          }

          const provider = new InfuraProvider('mainnet', process.env.INFURA_PROJECT_ID);
          const ethBalance = await provider.getBalance(address);
          assets.push({ type: 'token', name: 'ETH', balance: ethers.formatEther(ethBalance) });

          // Fetch ERC-20 Tokens (Covalent API)
          if (!process.env.COVALENT_API_KEY) {
            throw new Error('Missing COVALENT_API_KEY in .env');
          }

          const covalentResponse = await fetch(
            `https://api.covalenthq.com/v1/1/address/${address}/balances_v2/?key=${process.env.COVALENT_API_KEY}`
          );

          const covalentData: CovalentResponse = await covalentResponse.json();
          if (covalentData?.data?.items) {
            covalentData.data.items.forEach((token) => {
              assets.push({
                type: 'token',
                name: token.contract_name,
                balance: (Number(token.balance) / 10 ** token.contract_decimals).toString(),
              });
            });
          }
        } catch (error) {
          console.error('❌ Ethereum Error:', error);
        }

        // Fetch NFTs from OpenSea
        try {
          const openseaResponse = await fetch(
            `https://api.opensea.io/api/v1/assets?owner=${address}&limit=50`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          );
          const openseaData = await openseaResponse.json();

          if (openseaData?.assets) {
            openseaData.assets.forEach((nft: { name: string; token_id: string; image_url: string }) => {
              assets.push({ type: 'nft', name: nft.name, id: nft.token_id, image: nft.image_url });
            });
          }
        } catch (error) {
          console.error('❌ OpenSea Error:', error);
        }
        break;

      case 'Solana':
        try {
          const connection = new Connection('https://api.mainnet-beta.solana.com');
          const publicKey = new PublicKey(address);

          // Fetch tokens
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            programId: TOKEN_PROGRAM_ID,
          });

          tokenAccounts.value.forEach((account) => {
            const tokenAmount = account.account.data.parsed.info.tokenAmount.uiAmount;
            assets.push({ type: 'token', name: 'SPL Token', balance: tokenAmount.toString() });
          });

          // Fetch NFTs using Metaplex
          const metaplex = new Metaplex(connection);
          const nfts = await metaplex.nfts().findAllByOwner({ owner: publicKey });

          nfts.forEach((nft) => {
            if ('name' in nft && 'uri' in nft && 'mint' in nft) {
              assets.push({
                type: 'nft',
                name: nft.name,
                id: nft.mint.address.toString(),
                image: nft.uri,
              });
            }
          });
        } catch (error) {
          console.error('❌ Solana Error:', error);
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported blockchain' },
          { status: 400 }
        );
    }

    return NextResponse.json({ assets: assets ?? [] });
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet assets' },
      { status: 500 }
    );
  }
}
