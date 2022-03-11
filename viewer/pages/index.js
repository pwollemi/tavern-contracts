import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

import { ethers } from "ethers"
import { FetchWrapper, NftProvider, useNft } from "use-nft"
import { useEffect, useState } from 'react'

const RPC_URL = "http://127.0.0.1:8545" //"https://speedy-nodes-nyc.moralis.io/50561c02c5a853febf23eb96/avalanche/mainnet"; //

// We are using the "ethers" fetcher here.
const ethersConfig = {
  provider: new ethers.providers.JsonRpcProvider(RPC_URL),
}

const fetcher = ["ethers", ethersConfig]

const fetchWrapper = new FetchWrapper(fetcher)

export default function Home() {
  return (
    <NftProvider fetcher={fetcher}>
      <Nft />
    </NftProvider>
  )
}

const myLoader = ({ src, width, quality }) => {
  return `${src}`
}

function Nft() {

  const [nft, setNft] = useState({"name": "", "description": "", "image": "https://example.com"});

  useEffect(() => {
    const interval = setInterval(() => {
      fetchWrapper.fetchNft(
        '0xf5E723f0FD54f8c75f0Da8A8F9D68Bf67B20b850',
        "4036"
      ).then(r => {
        setNft(r);
        console.log("REsult", r);
      })
    }, 500);

    return () => {
      clearInterval(interval);
    }
  })
  // You can now display the NFT metadata.
  return (
    <section>
      <h1>{nft.name}</h1>
      <Image loader={myLoader} src={nft.image} alt="" width={500} height={500}/>
      <p>{nft.description}</p>
      <p>Owner: {nft.owner}</p>
      <p>Metadata URL: {nft.metadataUrl}</p>
    </section>
  )
}