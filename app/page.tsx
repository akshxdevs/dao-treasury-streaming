"use client";
import WalletConnect from "./Components/WalletConnect";

export default function Home() {
  return (
    <div className="flex justify-center items-center h-screen">
      <WalletConnect onConnect={(address)=>console.log("Connected to",address)}/>
    </div>
  );
}
