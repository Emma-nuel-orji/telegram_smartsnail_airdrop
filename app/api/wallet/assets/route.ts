import { NextResponse } from 'next/server';
import { TonClient } from 'ton'; // Example for TON
import { InfuraProvider } from 'ethers';
import 'dotenv/config';
import { ethers } from 'ethers';
import { Address } from '@ton/core';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Metaplex } from '@metaplex-foundation/js';
import { Connection, PublicKey } from '@solana/web3.js'; // Example for Solana

interface CovalentResponse {
  data: {
    items: {
      contract_name: string;
      balance: string | number;
      contract_address: string;
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
    let assets = [];

    switch (blockchain) {
      case 'TON':
        try {
          const tonClient = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });
          const tonBalance = await tonClient.getBalance(Address.parse(address));
          assets.push({ type: 'token', name: 'TON', balance: tonBalance.toString() });

          // Uncomment and implement NFT fetching logic
          // const tonNfts = await tonClient.getNfts(address);
          // tonNfts.forEach((nft: { name: any; id: any; image: any; }) => {
          //   assets.push({ type: 'nft', name: nft.name, id: nft.id, image: nft.image });
          // });
        } catch (error) {
          console.error('Failed to fetch TON assets:', error);
        }
        break;

      case 'Ethereum':
        try {
          const provider = new InfuraProvider('mainnet', process.env.INFURA_PROJECT_ID);
          const ethBalance = await provider.getBalance(address);
          assets.push({ type: 'token', name: 'ETH', balance: ethers.formatEther(ethBalance) });
        } catch (error) {
          console.error('Failed to fetch Ethereum balance:', error);
        }

        try {
          const covalentResponse = await fetch(
            `https://api.covalenthq.com/v1/1/address/${address}/balances_v2/?key=${process.env.COVALENT_API_KEY}`
          );
          const covalentData: CovalentResponse = await covalentResponse.json();
          covalentData.data.items.forEach((token) => {
            assets.push({ type: 'token', name: token.contract_name, balance: token.balance });
          });
        } catch (error) {
          console.error('Failed to fetch ERC-20 tokens:', error);
        }

        try {
          const openseaResponse = await fetch(
            `https://api.opensea.io/api/v1/assets?owner=${address}&limit=50`
          );
          const openseaData = await openseaResponse.json();
          openseaData.assets.forEach((nft: { name: any; token_id: any; image_url: any; }) => {
            assets.push({ type: 'nft', name: nft.name, id: nft.token_id, image: nft.image_url });
          });
        } catch (error) {
          console.error('Failed to fetch NFTs from OpenSea:', error);
        }
        break;

      case 'Solana':
        try {
          const connection = new Connection('https://api.mainnet-beta.solana.com');
          const publicKey = new PublicKey(address);

          // Fetch tokens
          const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
          tokenAccounts.value.forEach((account) => {
            assets.push({ type: 'token', name: 'SOL', balance: account.account.lamports.toString() });
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
          console.error('Failed to fetch Solana assets:', error);
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported blockchain' },
          { status: 400 }
        );
    }

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Failed to fetch wallet assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet assets' },
      { status: 500 }
    );
  }
}