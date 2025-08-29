"use client";
import WalletConnect from "./Components/WalletConnect";

export default function Home() {
  return (
    <div>
      <WalletConnect onConnect={(address)=>console.log("Connected to",address)}/>
    </div>
  );
}
