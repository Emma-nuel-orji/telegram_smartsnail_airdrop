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
        // Add other properties as needed
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
        // Fetch TON assets
        const tonClient = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });
            const tonBalance = await tonClient.getBalance(Address.parse(address));
        // const tonNfts = await tonClient.getNfts(address); // Example function, replace with actual logic
        assets.push({ type: 'token', name: 'TON', balance: tonBalance.toString() });
        // tonNfts.forEach((nft: { name: any; id: any; image: any; }) => {
        //   assets.push({ type: 'nft', name: nft.name, id: nft.id, image: nft.image });
        // });
        break;

      case 'Ethereum':
        // Fetch Ethereum assets
        const provider = new InfuraProvider('mainnet', process.env.INFURA_PROJECT_ID);
        const ethBalance = await provider.getBalance(address);
        assets.push({ type: 'token', name: 'ETH', balance: ethers.formatEther(ethBalance) });

        // Fetch ERC-20 tokens using Covalent API
        const covalentResponse = await fetch(
          `https://api.covalenthq.com/v1/1/address/${address}/balances_v2/?key=YOUR_COVALENT_API_KEY`
        );
        const covalentData: CovalentResponse = await covalentResponse.json(); 

        // Or type it in the forEach:
        covalentData.data.items.forEach((token: CovalentResponse['data']['items'][0]) => {
        assets.push({ type: 'token', name: token.contract_name, balance: token.balance });
        });

        // Fetch NFTs using OpenSea API
        const openseaResponse = await fetch(
          `https://api.opensea.io/api/v1/assets?owner=${address}&limit=50`
        );
        const openseaData = await openseaResponse.json();
        openseaData.assets.forEach((nft: { name: any; token_id: any; image_url: any; }) => {
          assets.push({ type: 'nft', name: nft.name, id: nft.token_id, image: nft.image_url });
        });
        break;

      case 'Solana':
        // Fetch Solana assets
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